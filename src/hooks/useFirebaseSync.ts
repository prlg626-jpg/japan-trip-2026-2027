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
import { seedTripIfNeeded, subscribeTripState, writeTripState } from "../services/tripRepository";

export type SyncStatus = "local" | "online" | "offline" | "syncing" | "verified" | "error";

export function useFirebaseSync(state: TripState, replaceState: (state: TripState) => void) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<SyncStatus>(firebaseConfigured() ? "offline" : "local");
  const [message, setMessage] = useState(firebaseConfigured() ? "" : "Firebase no configurado");
  const lastRemote = useRef("");
  const ready = useRef(false);
  const saveQueue = useRef(Promise.resolve());
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    listenToAuth((authUser) => setUser(authUser)).then((fn) => {
      unsubscribe = fn;
    });
    return () => unsubscribe?.();
  }, []);

  useEffect(() => {
    if (!firebaseConfigured()) return;
    const updateOnline = () => setStatus(navigator.onLine ? "online" : "offline");
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
    setStatus("syncing");
    getFirebaseServices()
      .then(async (firebase) => {
        if (!firebase || cancelled) return;
        await seedTripIfNeeded(firebase.db, user, state);
        unsubscribe = subscribeTripState(firebase.db, state, (remoteState, pendingWrites) => {
          const serialized = JSON.stringify(remoteState);
          lastRemote.current = serialized;
          ready.current = true;
          replaceState(remoteState);
          setStatus(pendingWrites ? "syncing" : navigator.onLine ? "online" : "offline");
          setMessage("");
        });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user || !firebaseConfigured() || !ready.current) return;
    const serialized = JSON.stringify(state);
    if (serialized === lastRemote.current) return;

    setStatus("syncing");
    setMessage("Guardando en Firestore…");

    saveQueue.current = saveQueue.current
      .catch(() => undefined)
      .then(async () => {
        const firebase = await getFirebaseServices();
        if (!firebase) throw new Error("Firebase no está disponible.");
        const receipt = await writeTripState(firebase.db, state);
        lastRemote.current = serialized;
        setVerifiedAt(receipt.verifiedAt);
        setStatus("verified");
        setMessage("Guardado en nube ✓");
      })
      .catch((error) => {
        console.error(error);
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Error verificando el guardado en Firestore");
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
