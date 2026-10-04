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
  readSyncManifestFromServer,
  saveSessionRecoverySnapshot,
  seedTripIfNeeded,
  subscribeTripState,
  writeTripState,
} from "../services/tripRepository";
import { blackBoxIsNewer } from "../utils/syncProtocol";

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
  const saveQueue = useRef(Promise.resolve());
  const pendingLocalWrites = useRef(0);
  const latestRequested = useRef("");

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    listenToAuth((authUser) => setUser(authUser)).then((fn) => {
      unsubscribe = fn;
    });
    return () => unsubscribe?.();
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

        const manifest = await readSyncManifestFromServer(firebase.db);

        // Completeness is monotonic for this trip: activities/zone places are
        // excluded by flags, not physically deleted. Therefore a browser with
        // fewer canonical records must never overwrite a more complete cloud.
        const localIsAtLeastAsComplete =
          !manifest ||
          (localState.activities.length >= manifest.counts.activities &&
            localState.zonePlaces.length >= manifest.counts.zonePlaces);
        const localIsMoreComplete =
          Boolean(manifest) &&
          localIsAtLeastAsComplete &&
          (localState.activities.length > manifest.counts.activities ||
            localState.zonePlaces.length > manifest.counts.zonePlaces);

        // Fresh/legacy cloud: local wins. A genuinely newer persisted browser
        // can also win, but only if it is not missing canonical trip data.
        // A more-complete bundled recovery state (the 124-activity baseline)
        // is allowed to repair a degraded cloud even on a fresh browser.
        const localShouldWin =
          !manifest ||
          localIsMoreComplete ||
          (loadedFromLocal &&
            localIsAtLeastAsComplete &&
            blackBoxIsNewer(localState.activityBlackBox, manifest.blackBoxUpdatedAt));

        if (localShouldWin) {
          const receipt = await writeTripState(firebase.db, localState);
          lastRemote.current = JSON.stringify(localState);
          setVerifiedAt(receipt.verifiedAt);
          setStatus("verified");
          setMessage("Guardado en nube ✓");
        }

        if (cancelled) return;

        unsubscribe = subscribeTripState(
          firebase.db,
          localState,
          (remoteState, _pendingWrites, committedManifest) => {
            if (cancelled) return;

            ready.current = true;

            // Never let an intermediate/older remote snapshot overwrite local
            // user edits that are still queued for server verification.
            if (pendingLocalWrites.current > 0) return;

            const serialized = JSON.stringify(remoteState);
            lastRemote.current = serialized;
            replaceState(remoteState);
            setVerifiedAt(committedManifest.committedAt);
            setStatus(navigator.onLine ? "verified" : "offline");
            setMessage(navigator.onLine ? "Guardado en nube ✓" : "");
          },
        );
      })
      .catch((error) => {
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
    if (!user || !firebaseConfigured() || !ready.current) return;

    const serialized = JSON.stringify(state);
    if (serialized === lastRemote.current) return;

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

        const receipt = await writeTripState(firebase.db, snapshot);
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
    signIn: signInWithGoogle,
    signOut: signOutGoogle,
  };
}
