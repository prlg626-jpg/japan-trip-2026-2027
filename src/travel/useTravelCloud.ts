import { useEffect, useMemo, useState } from "react";
import { GoogleAuthProvider, signInWithRedirect, type User } from "firebase/auth";
import initialTrip from "../data/initialTrip.json";
import { firebaseConfigured, getFirebaseServices, listenToAuth, signOutGoogle } from "../services/firebase";
import { subscribeTripState } from "../services/tripRepository";
import type { TripState } from "../types";

export type TravelCloudStatus = "loading" | "ready" | "offline" | "error";

export function useTravelCloud() {
  const [user, setUser] = useState<User | null>(null);
  const [state, setState] = useState<TripState>(() =>
    structuredClone(initialTrip as TripState),
  );
  const [status, setStatus] = useState<TravelCloudStatus>("loading");
  const [message, setMessage] = useState("Conectando con el viaje…");

  useEffect(() => {
    let unsubscribe = () => {};
    listenToAuth((nextUser) => setUser(nextUser))
      .then((fn) => {
        unsubscribe = fn;
      })
      .catch((error) => {
        console.error(error);
        setStatus("error");
        setMessage("No se pudo iniciar Firebase.");
      });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !firebaseConfigured()) return;

    let unsubscribe = () => {};
    let cancelled = false;

    setStatus(navigator.onLine ? "loading" : "offline");
    setMessage(navigator.onLine ? "Leyendo itinerario…" : "Sin conexión · usando caché si está disponible");

    getFirebaseServices()
      .then((firebase) => {
        if (!firebase || cancelled) return;
        unsubscribe = subscribeTripState(
          firebase.db,
          structuredClone(initialTrip as TripState),
          (remoteState) => {
            if (cancelled) return;
            setState(remoteState);
            setStatus(navigator.onLine ? "ready" : "offline");
            setMessage(navigator.onLine ? "Viaje sincronizado" : "Modo sin conexión");
          },
        );
      })
      .catch((error) => {
        console.error(error);
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "No se pudo abrir el viaje.");
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [user]);

  useEffect(() => {
    const update = () => {
      if (!navigator.onLine) {
        setStatus("offline");
        setMessage("Sin conexión · el itinerario cargado sigue disponible");
      } else if (user) {
        setMessage("Reconectando…");
      }
    };
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [user]);

  const signIn = async () => {
    const firebase = await getFirebaseServices();
    if (!firebase) throw new Error("Firebase no está disponible.");
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithRedirect(firebase.auth, provider);
  };

  return useMemo(
    () => ({
      user,
      state,
      status,
      message,
      configured: firebaseConfigured(),
      signIn,
      signOut: signOutGoogle,
    }),
    [user, state, status, message],
  );
}
