import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";
import {
  enableMultiTabIndexedDbPersistence,
  getFirestore,
  type Firestore,
} from "firebase/firestore";

export interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

let services: FirebaseServices | null = null;
let persistenceStarted = false;

export function firebaseConfigured() {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}

export async function getFirebaseServices(): Promise<FirebaseServices | null> {
  if (!firebaseConfigured()) return null;
  if (services) return services;
  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app);
  services = { app, auth, db };
  if (!persistenceStarted) {
    persistenceStarted = true;
    try {
      await enableMultiTabIndexedDbPersistence(db);
    } catch (error) {
      console.warn("Firestore offline persistence could not be enabled", error);
    }
  }
  return services;
}

export async function signInWithGoogle() {
  const firebase = await getFirebaseServices();
  if (!firebase) throw new Error("Firebase is not configured");
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(firebase.auth, provider);
}

export async function signOutGoogle() {
  const firebase = await getFirebaseServices();
  if (!firebase) return;
  await signOut(firebase.auth);
}

export async function listenToAuth(callback: (user: User | null) => void) {
  const firebase = await getFirebaseServices();
  if (!firebase) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(firebase.auth, callback);
}
