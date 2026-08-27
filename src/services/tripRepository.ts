import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import type { TripState } from "../types";

const tripIdFromEnv = import.meta.env.VITE_TRIP_ID || "japan-trip-2026-2027";

const COLLECTIONS = [
  "days",
  "activities",
  "hotels",
  "purchases",
  "reservations",
  "sources",
  "library",
] as const;

type CollectionName = (typeof COLLECTIONS)[number];

function tripRef(db: Firestore, tripId = tripIdFromEnv) {
  return doc(db, "trips", tripId);
}

function collectionRef(db: Firestore, name: CollectionName, tripId = tripIdFromEnv) {
  return collection(db, "trips", tripId, name);
}

function withoutUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function replaceCollection<T extends { id: string }>(
  db: Firestore,
  tripId: string,
  name: CollectionName,
  items: T[],
) {
  const existing = await getDocs(collectionRef(db, name, tripId));
  const batch = writeBatch(db);
  const wanted = new Set(items.map((item) => item.id));
  existing.forEach((snapshot) => {
    if (!wanted.has(snapshot.id)) batch.delete(snapshot.ref);
  });
  for (const item of items) {
    batch.set(doc(db, "trips", tripId, name, item.id), withoutUndefined(item), { merge: false });
  }
  await batch.commit();
}

export async function seedTripIfNeeded(db: Firestore, user: User, state: TripState) {
  const id = tripIdFromEnv || state.trip.id;
  const ref = tripRef(db, id);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) {
    await setDoc(ref, {
      id,
      name: state.trip.displayName,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await setDoc(doc(db, "trips", id, "members", user.uid), {
      uid: user.uid,
      email: user.email,
      role: "owner",
      addedAt: serverTimestamp(),
    });
    await writeTripState(db, state, id);
  }
}

export async function writeTripState(db: Firestore, state: TripState, tripId = tripIdFromEnv) {
  const id = tripId || state.trip.id;
  await setDoc(
    tripRef(db, id),
    {
      id,
      name: state.trip.displayName,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await setDoc(
    doc(db, "trips", id, "settings", "main"),
    withoutUndefined({
      schemaVersion: state.schemaVersion,
      generatedAt: state.generatedAt,
      source: state.source,
      trip: state.trip,
      settings: state.settings,
      costs: state.costs,
      hotelRoutes: state.hotelRoutes,
      research: state.research,
      decisions: state.decisions,
      booked: state.booked,
      notes: state.notes,
      migrationReport: state.migrationReport,
      updatedAt: new Date().toISOString(),
    }),
    { merge: false },
  );
  await setDoc(doc(db, "trips", id, "settings", "budget"), withoutUndefined(state.budget), {
    merge: false,
  });
  await Promise.all([
    replaceCollection(db, id, "days", state.days),
    replaceCollection(db, id, "activities", state.activities),
    replaceCollection(db, id, "hotels", state.hotels),
    replaceCollection(db, id, "purchases", state.purchases),
    replaceCollection(db, id, "reservations", state.reservations),
    replaceCollection(db, id, "sources", state.sources),
    replaceCollection(db, id, "library", state.library),
  ]);
}

export function subscribeTripState(
  db: Firestore,
  currentState: TripState,
  onState: (state: TripState, pendingWrites: boolean) => void,
  tripId = tripIdFromEnv,
): Unsubscribe {
  const latest: Partial<Record<CollectionName, unknown[]>> = {};
  let settings: Partial<TripState> | null = null;
  let budget: TripState["budget"] | null = null;
  let pending = false;

  const emit = () => {
    if (!settings || !budget) return;
    for (const name of COLLECTIONS) {
      if (!latest[name]) return;
    }
    onState(
      {
        ...currentState,
        ...settings,
        budget,
        days: (latest.days ?? []) as TripState["days"],
        activities: (latest.activities ?? []) as TripState["activities"],
        hotels: (latest.hotels ?? []) as TripState["hotels"],
        purchases: (latest.purchases ?? []) as TripState["purchases"],
        reservations: (latest.reservations ?? []) as TripState["reservations"],
        sources: (latest.sources ?? []) as TripState["sources"],
        library: (latest.library ?? []) as TripState["library"],
      },
      pending,
    );
  };

  const unsubscribers: Unsubscribe[] = [];
  unsubscribers.push(
    onSnapshot(doc(db, "trips", tripId, "settings", "main"), (snapshot) => {
      pending = pending || snapshot.metadata.hasPendingWrites;
      if (snapshot.exists()) settings = snapshot.data() as Partial<TripState>;
      emit();
    }),
  );
  unsubscribers.push(
    onSnapshot(doc(db, "trips", tripId, "settings", "budget"), (snapshot) => {
      pending = pending || snapshot.metadata.hasPendingWrites;
      if (snapshot.exists()) budget = snapshot.data() as TripState["budget"];
      emit();
    }),
  );
  for (const name of COLLECTIONS) {
    unsubscribers.push(
      onSnapshot(collectionRef(db, name, tripId), (snapshot) => {
        pending = pending || snapshot.metadata.hasPendingWrites;
        latest[name] = snapshot.docs
          .map((item) => item.data())
          .sort((a, b) => {
            const left = a as { date?: string; order?: number; id?: string };
            const right = b as { date?: string; order?: number; id?: string };
            return (
              String(left.date ?? "").localeCompare(String(right.date ?? "")) ||
              Number(left.order ?? 0) - Number(right.order ?? 0) ||
              String(left.id ?? "").localeCompare(String(right.id ?? ""))
            );
          });
        emit();
      }),
    );
  }

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

export async function deleteTrip(db: Firestore, tripId = tripIdFromEnv) {
  await deleteDoc(tripRef(db, tripId));
}
