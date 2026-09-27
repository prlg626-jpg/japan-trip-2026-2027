import {
  collection,
  deleteDoc,
  doc,
  getDocFromServer,
  getDocsFromServer,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import type { ActivityBlackBox, TripState } from "../types";
import {
  SYNC_COLLECTIONS,
  buildSyncManifest,
  revisionOf,
  selectionFingerprint,
  stateSelectionFingerprint,
  stripRevision,
  type Revisioned,
  type SyncCollectionName,
  type SyncManifest,
} from "../utils/syncProtocol";

const tripIdFromEnv = import.meta.env.VITE_TRIP_ID || "japan-trip-2026-2027";

export interface CloudSaveReceipt {
  revision: string;
  verifiedAt: string;
  activityFingerprint: string;
}

function tripRef(db: Firestore, tripId = tripIdFromEnv) {
  return doc(db, "trips", tripId);
}

function collectionRef(db: Firestore, name: SyncCollectionName, tripId = tripIdFromEnv) {
  return collection(db, "trips", tripId, name);
}

function withoutUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function sortDocuments(items: unknown[]) {
  return [...items].sort((a, b) => {
    const left = a as { date?: string; order?: number; id?: string };
    const right = b as { date?: string; order?: number; id?: string };
    return (
      String(left.date ?? "").localeCompare(String(right.date ?? "")) ||
      Number(left.order ?? 0) - Number(right.order ?? 0) ||
      String(left.id ?? "").localeCompare(String(right.id ?? ""))
    );
  });
}

async function replaceCollection<T extends { id: string }>(
  db: Firestore,
  tripId: string,
  name: SyncCollectionName,
  items: T[],
  revision: string,
) {
  const existing = await getDocsFromServer(collectionRef(db, name, tripId));
  const batch = writeBatch(db);
  const wanted = new Set(items.map((item) => item.id));

  existing.forEach((snapshot) => {
    if (!wanted.has(snapshot.id)) batch.delete(snapshot.ref);
  });

  for (const item of items) {
    batch.set(
      doc(db, "trips", tripId, name, item.id),
      withoutUndefined({ ...item, __revision: revision }),
      { merge: false },
    );
  }

  await batch.commit();
}

export async function seedTripIfNeeded(db: Firestore, user: User, state: TripState) {
  const id = tripIdFromEnv || state.trip.id;
  const ref = tripRef(db, id);
  const snapshot = await getDocFromServer(ref);

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
    return;
  }

  const memberRef = doc(db, "trips", id, "members", user.uid);
  const member = await getDocFromServer(memberRef);
  if (!member.exists() && snapshot.data().createdBy === user.uid) {
    await setDoc(memberRef, {
      uid: user.uid,
      email: user.email,
      role: "owner",
      addedAt: serverTimestamp(),
    });
  }
}

export async function saveSessionRecoverySnapshot(
  db: Firestore,
  user: User,
  state: TripState,
  tripId = tripIdFromEnv,
) {
  const id = tripId || state.trip.id;
  const snapshotRef = doc(db, "trips", id, "settings", `session-recovery-${user.uid}`);
  const payload = withoutUndefined({
    savedAt: new Date().toISOString(),
    userId: user.uid,
    activityFingerprint: stateSelectionFingerprint(state),
    activityBlackBox: state.activityBlackBox ?? null,
    selectedActivities: state.activities.filter((activity) => activity.included),
    selectedZonePlaces: state.zonePlaces.filter((place) => place.selected),
  });

  await setDoc(snapshotRef, payload, { merge: false });
  const verified = await getDocFromServer(snapshotRef);
  if (!verified.exists()) {
    throw new Error("No se pudo verificar el respaldo remoto de la sesión.");
  }

  const remote = verified.data() as { activityFingerprint?: string };
  if (remote.activityFingerprint !== payload.activityFingerprint) {
    throw new Error("El respaldo remoto de la sesión no coincide con las selecciones locales.");
  }

  return verified.data();
}

export async function readSyncManifestFromServer(
  db: Firestore,
  tripId = tripIdFromEnv,
): Promise<SyncManifest | null> {
  const snapshot = await getDocFromServer(doc(db, "trips", tripId, "settings", "sync-manifest"));
  return snapshot.exists() ? (snapshot.data() as SyncManifest) : null;
}

export async function verifyTripStateFromServer(
  db: Firestore,
  state: TripState,
  revision: string,
  tripId = tripIdFromEnv,
): Promise<CloudSaveReceipt> {
  const expectedFingerprint = stateSelectionFingerprint(state);
  const [manifestSnapshot, activitiesSnapshot, zonePlacesSnapshot, blackBoxSnapshot] =
    await Promise.all([
      getDocFromServer(doc(db, "trips", tripId, "settings", "sync-manifest")),
      getDocsFromServer(collectionRef(db, "activities", tripId)),
      getDocsFromServer(collectionRef(db, "zonePlaces", tripId)),
      state.activityBlackBox
        ? getDocFromServer(doc(db, "trips", tripId, "settings", "activity-black-box"))
        : Promise.resolve(null),
    ]);

  if (!manifestSnapshot.exists()) {
    throw new Error("Firestore no confirmó el manifiesto de sincronización.");
  }

  const manifest = manifestSnapshot.data() as SyncManifest;
  if (manifest.revision !== revision) {
    throw new Error("La revisión confirmada por Firestore no coincide con la escritura actual.");
  }

  if (activitiesSnapshot.size !== state.activities.length) {
    throw new Error("Firestore confirmó un número distinto de actividades.");
  }
  if (zonePlacesSnapshot.size !== state.zonePlaces.length) {
    throw new Error("Firestore confirmó un número distinto de lugares seleccionables.");
  }

  const rawActivities = activitiesSnapshot.docs.map((item) => item.data());
  const rawZonePlaces = zonePlacesSnapshot.docs.map((item) => item.data());

  if (rawActivities.some((item) => revisionOf(item) !== revision)) {
    throw new Error("Firestore contiene actividades de otra revisión.");
  }
  if (rawZonePlaces.some((item) => revisionOf(item) !== revision)) {
    throw new Error("Firestore contiene lugares de otra revisión.");
  }

  const remoteFingerprint = selectionFingerprint(
    rawActivities.map((item) => stripRevision(item as Revisioned<TripState["activities"][number]>)),
    rawZonePlaces.map((item) => stripRevision(item as Revisioned<TripState["zonePlaces"][number]>)),
  );

  if (
    remoteFingerprint !== expectedFingerprint ||
    manifest.activityFingerprint !== expectedFingerprint
  ) {
    throw new Error("Las selecciones leídas desde Firestore no coinciden con las guardadas.");
  }

  if (state.activityBlackBox) {
    if (!blackBoxSnapshot || !blackBoxSnapshot.exists()) {
      throw new Error("Firestore no confirmó la caja negra de actividades.");
    }
    const remoteBlackBox = blackBoxSnapshot.data() as ActivityBlackBox & { __revision?: string };
    if (
      revisionOf(remoteBlackBox) !== revision ||
      remoteBlackBox.updatedAt !== state.activityBlackBox.updatedAt
    ) {
      throw new Error("La caja negra remota no coincide con la selección guardada.");
    }
  }

  return {
    revision,
    verifiedAt: manifest.committedAt,
    activityFingerprint: remoteFingerprint,
  };
}

export async function writeTripState(
  db: Firestore,
  state: TripState,
  tripId = tripIdFromEnv,
): Promise<CloudSaveReceipt> {
  const id = tripId || state.trip.id;
  const revision = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const manifest = buildSyncManifest(state, revision);

  await setDoc(
    tripRef(db, id),
    {
      id,
      name: state.trip.displayName,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  const writes: Promise<unknown>[] = [
    setDoc(
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
        ryokanCandidates: state.ryokanCandidates,
        removedItems: state.removedItems,
        __revision: revision,
      }),
      { merge: false },
    ),
    setDoc(
      doc(db, "trips", id, "settings", "budget"),
      withoutUndefined({ ...state.budget, __revision: revision }),
      { merge: false },
    ),
    ...SYNC_COLLECTIONS.map((name) =>
      replaceCollection(
        db,
        id,
        name,
        state[name] as Array<{ id: string }>,
        revision,
      ),
    ),
  ];

  if (state.activityBlackBox) {
    writes.push(
      setDoc(
        doc(db, "trips", id, "settings", "activity-black-box"),
        withoutUndefined({ ...state.activityBlackBox, __revision: revision }),
        { merge: false },
      ),
    );
  }

  await Promise.all(writes);

  // This is the commit point. Listeners never accept a revision until this
  // manifest exists and every cached document matches it.
  await setDoc(
    doc(db, "trips", id, "settings", "sync-manifest"),
    withoutUndefined(manifest),
    { merge: false },
  );

  await setDoc(
    tripRef(db, id),
    {
      lastRevision: revision,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return verifyTripStateFromServer(db, state, revision, id);
}

export function subscribeTripState(
  db: Firestore,
  currentState: TripState,
  onState: (state: TripState, pendingWrites: boolean, manifest: SyncManifest) => void,
  tripId = tripIdFromEnv,
): Unsubscribe {
  const latest: Partial<Record<SyncCollectionName, unknown[]>> = {};
  let settingsRaw: Record<string, unknown> | null = null;
  let budgetRaw: Record<string, unknown> | null = null;
  let activityBlackBoxRaw: (ActivityBlackBox & { __revision?: string }) | null = null;
  let manifest: SyncManifest | null = null;
  const pendingBySource = new Map<string, boolean>();

  const hasPendingWrites = () => [...pendingBySource.values()].some(Boolean);

  const emit = () => {
    if (!manifest || !settingsRaw || !budgetRaw || hasPendingWrites()) return;

    const revision = manifest.revision;
    if (revisionOf(settingsRaw) !== revision || revisionOf(budgetRaw) !== revision) return;

    if (manifest.blackBoxUpdatedAt) {
      if (!activityBlackBoxRaw || revisionOf(activityBlackBoxRaw) !== revision) return;
      if (activityBlackBoxRaw.updatedAt !== manifest.blackBoxUpdatedAt) return;
    }

    for (const name of SYNC_COLLECTIONS) {
      const items = latest[name];
      if (!items) return;
      if (items.length !== manifest.counts[name]) return;
      if (items.some((item) => revisionOf(item) !== revision)) return;
    }

    const settings = stripRevision(settingsRaw as Revisioned<Partial<TripState>>);
    const budget = stripRevision(
      budgetRaw as unknown as Revisioned<TripState["budget"]>,
    );
    const blackBox = manifest.blackBoxUpdatedAt && activityBlackBoxRaw
      ? stripRevision(activityBlackBoxRaw)
      : undefined;

    onState(
      {
        ...currentState,
        ...settings,
        budget,
        days: (latest.days ?? []).map((item) =>
          stripRevision(item as Revisioned<TripState["days"][number]>),
        ),
        activities: (latest.activities ?? []).map((item) =>
          stripRevision(item as Revisioned<TripState["activities"][number]>),
        ),
        hotels: (latest.hotels ?? []).map((item) =>
          stripRevision(item as Revisioned<TripState["hotels"][number]>),
        ),
        purchases: (latest.purchases ?? []).map((item) =>
          stripRevision(item as Revisioned<TripState["purchases"][number]>),
        ),
        reservations: (latest.reservations ?? []).map((item) =>
          stripRevision(item as Revisioned<TripState["reservations"][number]>),
        ),
        sources: (latest.sources ?? []).map((item) =>
          stripRevision(item as Revisioned<TripState["sources"][number]>),
        ),
        library: (latest.library ?? []).map((item) =>
          stripRevision(item as Revisioned<TripState["library"][number]>),
        ),
        zones: (latest.zones ?? []).map((item) =>
          stripRevision(item as Revisioned<TripState["zones"][number]>),
        ),
        zonePlaces: (latest.zonePlaces ?? []).map((item) =>
          stripRevision(item as Revisioned<TripState["zonePlaces"][number]>),
        ),
        routeSegments: (latest.routeSegments ?? []).map((item) =>
          stripRevision(item as Revisioned<TripState["routeSegments"][number]>),
        ),
        documents: (latest.documents ?? []).map((item) =>
          stripRevision(item as Revisioned<TripState["documents"][number]>),
        ),
        activityBlackBox: blackBox,
      },
      false,
      manifest,
    );
  };

  const unsubscribers: Unsubscribe[] = [];

  unsubscribers.push(
    onSnapshot(
      doc(db, "trips", tripId, "settings", "sync-manifest"),
      { includeMetadataChanges: true },
      (snapshot) => {
        pendingBySource.set("manifest", snapshot.metadata.hasPendingWrites);
        manifest = snapshot.exists() ? (snapshot.data() as SyncManifest) : null;
        emit();
      },
    ),
  );

  unsubscribers.push(
    onSnapshot(
      doc(db, "trips", tripId, "settings", "main"),
      { includeMetadataChanges: true },
      (snapshot) => {
        pendingBySource.set("main", snapshot.metadata.hasPendingWrites);
        settingsRaw = snapshot.exists() ? snapshot.data() : null;
        emit();
      },
    ),
  );

  unsubscribers.push(
    onSnapshot(
      doc(db, "trips", tripId, "settings", "budget"),
      { includeMetadataChanges: true },
      (snapshot) => {
        pendingBySource.set("budget", snapshot.metadata.hasPendingWrites);
        budgetRaw = snapshot.exists() ? snapshot.data() : null;
        emit();
      },
    ),
  );

  unsubscribers.push(
    onSnapshot(
      doc(db, "trips", tripId, "settings", "activity-black-box"),
      { includeMetadataChanges: true },
      (snapshot) => {
        pendingBySource.set("activity-black-box", snapshot.metadata.hasPendingWrites);
        activityBlackBoxRaw = snapshot.exists()
          ? (snapshot.data() as ActivityBlackBox & { __revision?: string })
          : null;
        emit();
      },
    ),
  );

  for (const name of SYNC_COLLECTIONS) {
    unsubscribers.push(
      onSnapshot(
        collectionRef(db, name, tripId),
        { includeMetadataChanges: true },
        (snapshot) => {
          pendingBySource.set(name, snapshot.metadata.hasPendingWrites);
          latest[name] = sortDocuments(snapshot.docs.map((item) => item.data()));
          emit();
        },
      ),
    );
  }

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

export async function deleteTrip(db: Firestore, tripId = tripIdFromEnv) {
  await deleteDoc(tripRef(db, tripId));
}
