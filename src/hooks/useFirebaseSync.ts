import { useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import type { TripState } from "../types";
import {
  firebaseConfigured,
  getFirebaseServices,
  listenToAuth,
  signInWithGoogle,
  signOutGoogle,
} from "../services/firebase";
import {
  readTripStateFromServer,
  saveSessionRecoverySnapshot,
  seedTripIfNeeded,
  subscribeTripState,
  writeTripState,
} from "../services/tripRepository";
import recoveryTrip from "../data/recoveryTrip.json";
import { recoverProtectedTrip } from "../utils/protectedRecovery";
import { blackBoxIsNewer, comparableTrip } from "../utils/syncProtocol";
import {
  CURRENT_RECOVERY_BASELINE,
  RECOVERY_BASELINE_STORAGE_KEY,
} from "../utils/recoveryBaseline";

export type SyncStatus = "local" | "online" | "offline" | "syncing" | "verified" | "error";

export function useFirebaseSync(
  state: TripState,
  replaceState: (state: TripState) => void,
  loadedFromLocal = false,
) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<SyncStatus>(firebaseConfigured() ? "offline" : "local");
  const [message, setMessage] = useState(firebaseConfigured() ? "" : "Firebase no configurado");
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);

  const stateRef = useRef(state);
  const lastRemote = useRef("");
  const ready = useRef(false);
  const remoteRevision = useRef<string | null>(null);
  const syncBlocked = useRef(false);
  const saveQueue = useRef(Promise.resolve());
  const pendingLocalWrites = useRef(0);
  const latestRequested = useRef("");

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    listenToAuth((authUser) => setUser(authUser)).then((fn) => {
      if (cancelled) fn();
      else unsubscribe = fn;
    });
    return () => { cancelled = true; unsubscribe?.(); };
  }, []);

  useEffect(() => {
    if (!firebaseConfigured()) return;
    const updateOnline = () => {
      if (!navigator.onLine) setStatus("offline");
    };
    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  useEffect(() => {
    if (!user || !firebaseConfigured()) return;

    let unsubscribe = () => {};
    let cancelled = false;
    ready.current = false;
    syncBlocked.current = false;
    setStatus("syncing");
    setMessage("Protegiendo la sesión actual…");

    getFirebaseServices()
      .then(async (firebase) => {
        if (!firebase || cancelled) return;

        const localState = stateRef.current;

        // The current browser state is backed up before any remote state can be
        // accepted. This is the emergency recovery copy for this device/session.
        await seedTripIfNeeded(firebase.db, user, localState);
        await saveSessionRecoverySnapshot(firebase.db, user, localState);
        if (cancelled) return;

        const remote = await readTripStateFromServer(firebase.db, localState);
        if (cancelled) return;
        const manifest = remote.manifest;
        remoteRevision.current = manifest?.revision ?? null;
        const cloudState = remote.state;
        const localIsAtLeastAsComplete =
          localState.activities.length >= cloudState.activities.length &&
          localState.zonePlaces.length >= cloudState.zonePlaces.length;
        const localShouldWin = loadedFromLocal && localIsAtLeastAsComplete &&
          blackBoxIsNewer(localState.activityBlackBox, cloudState.activityBlackBox?.updatedAt);
        let chosen = localShouldWin ? localState : cloudState;
        const recoveryBaselineMissing = manifest?.recoveryBaseline !== CURRENT_RECOVERY_BASELINE;
        const cloudNeedsRecords = chosen.activities.length < 124 || chosen.zonePlaces.length < 93;
        if (recoveryBaselineMissing || cloudNeedsRecords) {
          // Keep a full, immutable remote snapshot before repairing the cloud.
          await saveSessionRecoverySnapshot(firebase.db, user, cloudState);
          const lostSelections = recoveryBaselineMissing && (
            chosen.activities.filter((item) => item.included).length < 121 ||
            chosen.zonePlaces.filter((item) => item.selected).length < 80
          );
          chosen = recoverProtectedTrip(chosen, recoveryTrip as TripState, lostSelections);
        }
        if (cancelled) return;
        if (localShouldWin || recoveryBaselineMissing || cloudNeedsRecords) {
          const receipt = await writeTripState(firebase.db, chosen, undefined, remoteRevision.current);
          remoteRevision.current = receipt.revision;
          lastRemote.current = comparableTrip(chosen);
          replaceState(chosen);
          setVerifiedAt(receipt.verifiedAt);
          setStatus("verified");
          setMessage("Guardado en nube ✓");
        }

        if (cancelled) return;

        unsubscribe = subscribeTripState(
          firebase.db,
          chosen,
          (remoteState, _pendingWrites, committedManifest) => {
            if (cancelled || syncBlocked.current) return;

            ready.current = true;

            // Never let an intermediate/older remote snapshot overwrite local
            // user edits that are still queued for server verification.
            if (pendingLocalWrites.current > 0) return;

            remoteRevision.current = committedManifest.revision;
            const serialized = comparableTrip(remoteState);
            lastRemote.current = serialized;
            localStorage.setItem(RECOVERY_BASELINE_STORAGE_KEY, CURRENT_RECOVERY_BASELINE);
            replaceState(remoteState);
            setVerifiedAt(committedManifest.committedAt);
            setStatus(navigator.onLine ? "verified" : "offline");
            setMessage(navigator.onLine ? "Guardado en nube ✓" : "");
          },
        );
      })
      .catch((error) => {
        if (cancelled) return;
        console.error(error);
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Error de sincronización");
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [user, loadedFromLocal, replaceState]);

  useEffect(() => {
    if (!user || !firebaseConfigured() || !ready.current || syncBlocked.current) return;

    const serialized = comparableTrip(state);
    if (serialized === lastRemote.current || serialized === latestRequested.current) return;

    latestRequested.current = serialized;
    pendingLocalWrites.current += 1;
    setStatus("syncing");
    setMessage("Guardando en Firestore…");

    const snapshot = structuredClone(state);

    saveQueue.current = saveQueue.current
      .catch(() => undefined)
      .then(async () => {
        const firebase = await getFirebaseServices();
        if (!firebase) throw new Error("Firebase no está disponible.");

        if (syncBlocked.current) throw new Error("Sincronización detenida; tu copia local está conservada.");
        const receipt = await writeTripState(firebase.db, snapshot, undefined, remoteRevision.current);
        remoteRevision.current = receipt.revision;
        lastRemote.current = serialized;

        if (latestRequested.current === serialized) {
          setVerifiedAt(receipt.verifiedAt);
          setStatus("verified");
          setMessage("Guardado en nube ✓");
        } else {
          setStatus("syncing");
          setMessage("Guardando cambios más recientes…");
        }
      })
      .catch((error) => {
        syncBlocked.current = true;
        ready.current = false;
        console.error(error);
        if (latestRequested.current === serialized) {
          setStatus("error");
          setMessage(
            error instanceof Error
              ? error.message
              : "Error verificando el guardado en Firestore",
          );
        }
      })
      .finally(() => {
        pendingLocalWrites.current = Math.max(0, pendingLocalWrites.current - 1);
      });
  }, [state, user]);

  return {
    configured: firebaseConfigured(),
    user,
    status,
    message,
    verifiedAt,
    signIn: async () => {
      try { await signInWithGoogle(); }
      catch (error) {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "No se pudo iniciar sesión con Google.");
      }
    },
    signOut: signOutGoogle,
  };
}
