import {
  collection,
  deleteDoc,
  doc,
  getDocFromServer,
  getDocsFromServer,
  onSnapshot,
  runTransaction,
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
  comparableTrip,
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
  const snapshotRef = doc(db, "trips", id, "settings", `session-recovery-${user.uid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const payload = withoutUndefined({
    savedAt: new Date().toISOString(),
    userId: user.uid,
    activityFingerprint: stateSelectionFingerprint(state),
    stateJSON: JSON.stringify(state),
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
  if (verified.data().stateJSON !== payload.stateJSON) {
    throw new Error("La copia completa de recuperación no coincide con el viaje original.");
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

export async function readTripStateFromServer(db: Firestore, fallback: TripState, tripId = tripIdFromEnv) {
  // Query every collection, including legacy clouds without a manifest. Never
  // assume a missing manifest means that the existing trip is empty.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const before = await readSyncManifestFromServer(db, tripId);
    const [main, budget, blackBox, ...collections] = await Promise.all([
      getDocFromServer(doc(db, "trips", tripId, "settings", "main")),
      getDocFromServer(doc(db, "trips", tripId, "settings", "budget")),
      getDocFromServer(doc(db, "trips", tripId, "settings", "activity-black-box")),
      ...SYNC_COLLECTIONS.map((name) => getDocsFromServer(collectionRef(db, name, tripId))),
    ]);
    const after = await readSyncManifestFromServer(db, tripId);
    if (before?.revision !== after?.revision) continue;
    if (!main.exists()) throw new Error("La nube no contiene la configuración del viaje; se conserva la copia local.");
    const state = { ...structuredClone(fallback), ...stripRevision(main.data()),
      budget: budget.exists() ? stripRevision(budget.data()) : fallback.budget,
      activityBlackBox: blackBox.exists() ? stripRevision(blackBox.data()) : undefined,
    } as TripState;
    for (let i = 0; i < SYNC_COLLECTIONS.length; i += 1) {
      const name = SYNC_COLLECTIONS[i];
      const rows = collections[i].docs.map((item) => item.data());
      if (after && (rows.length !== after.counts[name] || rows.some((item) => revisionOf(item) !== after.revision))) {
        throw new Error("La nube contiene una revisión incompleta; se conserva la copia local sin sobrescribirla.");
      }
      (state[name] as unknown[]) = sortDocuments(rows).map((item) => stripRevision(item as Revisioned<object>));
    }
    if (after && (revisionOf(main.data()) !== after.revision || !budget.exists() || revisionOf(budget.data()) !== after.revision || stateSelectionFingerprint(state) !== after.activityFingerprint)) {
      throw new Error("La revisión remota no coincide con sus selecciones; se conserva la copia local.");
    }
    return { state, manifest: after };
  }
  throw new Error("El viaje cambió durante la lectura. Vuelve a conectar para sincronizar.");
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
    // Another tab may have committed an identical normalized trip while this
    // tab was reading. Verify all content before accepting that newer receipt.
    const latest = await readTripStateFromServer(db, state, tripId);
    if (latest.manifest && comparableTrip(latest.state) === comparableTrip(state)) {
      return { revision: latest.manifest.revision, verifiedAt: latest.manifest.committedAt, activityFingerprint: latest.manifest.activityFingerprint };
    }
    throw new Error(`Otra sesión cambió el viaje durante la verificación. Copia local conservada. Revisión enviada ${revision}; recibida ${manifest.revision}.`);
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
  expectedRevision?: string | null,
): Promise<CloudSaveReceipt> {
  const id = tripId || state.trip.id;
  const revision = crypto.randomUUID();
  const manifestRef = doc(db, "trips", id, "settings", "sync-manifest");
  const expected = expectedRevision === undefined
    ? (await readSyncManifestFromServer(db, id))?.revision ?? null
    : expectedRevision;
  const existing = await Promise.all(SYNC_COLLECTIONS.map((name) => getDocsFromServer(collectionRef(db, name, id))));
  const manifest = buildSyncManifest(state, revision);
  const main = { ...state } as Record<string, unknown>;
  for (const name of SYNC_COLLECTIONS) delete main[name];
  delete main.budget;
  delete main.activityBlackBox;

  // All collections and the commit marker change atomically. Checking the
  // previous revision prevents two browsers from silently replacing each other.
  await runTransaction(db, async (transaction) => {
    const current = await transaction.get(manifestRef);
    if ((current.exists() ? current.data().revision : null) !== expected) {
      throw new Error("El viaje cambió en otro dispositivo. Tu copia local está conservada; vuelve a conectar antes de guardar.");
    }
    transaction.set(tripRef(db, id), { id, name: state.trip.displayName, lastRevision: revision, updatedAt: serverTimestamp() }, { merge: true });
    transaction.set(doc(db, "trips", id, "settings", "main"), withoutUndefined({ ...main, __revision: revision }));
    transaction.set(doc(db, "trips", id, "settings", "budget"), withoutUndefined({ ...state.budget, __revision: revision }));
    if (state.activityBlackBox) transaction.set(doc(db, "trips", id, "settings", "activity-black-box"), withoutUndefined({ ...state.activityBlackBox, __revision: revision }));
    else transaction.delete(doc(db, "trips", id, "settings", "activity-black-box"));
    SYNC_COLLECTIONS.forEach((name, index) => {
      const wanted = new Set(state[name].map((item) => item.id));
      existing[index].forEach((item) => { if (!wanted.has(item.id)) transaction.delete(item.ref); });
      for (const item of state[name]) transaction.set(doc(db, "trips", id, name, item.id), withoutUndefined({ ...item, __revision: revision }));
    });
    transaction.set(manifestRef, withoutUndefined(manifest));
  });
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
    const fingerprint = selectionFingerprint(
      (latest.activities ?? []) as TripState["activities"],
      (latest.zonePlaces ?? []) as TripState["zonePlaces"],
    );
    if (fingerprint !== manifest.activityFingerprint) return;

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
