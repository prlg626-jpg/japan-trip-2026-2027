import type { Activity, ActivityBlackBox, TripState, ZonePlace } from "../types";
import { CURRENT_RECOVERY_BASELINE } from "./recoveryBaseline";

export const SYNC_COLLECTIONS = [
  "days",
  "activities",
  "hotels",
  "purchases",
  "reservations",
  "sources",
  "library",
  "zones",
  "zonePlaces",
  "routeSegments",
  "documents",
] as const;

export type SyncCollectionName = (typeof SYNC_COLLECTIONS)[number];

export interface SyncManifest {
  version: 1;
  revision: string;
  committedAt: string;
  counts: Record<SyncCollectionName, number>;
  activityFingerprint: string;
  blackBoxUpdatedAt: string;
  recoveryBaseline?: string;
}

export type Revisioned<T> = T & { __revision?: string };

export function revisionOf(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  return String((value as { __revision?: unknown }).__revision ?? "");
}

export function stripRevision<T>(value: Revisioned<T>): T {
  const clone = { ...(value as Record<string, unknown>) };
  delete clone.__revision;
  return clone as T;
}

export function selectionFingerprint(
  activities: Array<Pick<Activity, "id" | "included" | "dayId" | "order">>,
  zonePlaces: Array<Pick<ZonePlace, "id" | "selected" | "suggestedDayId" | "order">>,
) {
  const selectedActivities = activities
    .filter((activity) => activity.included)
    .map((activity) => `${activity.id}|${activity.dayId}|${activity.order}`)
    .sort();

  const selectedZonePlaces = zonePlaces
    .filter((place) => place.selected)
    .map((place) => `${place.id}|${place.suggestedDayId ?? ""}|${place.order}`)
    .sort();

  return JSON.stringify({
    activities: selectedActivities,
    zonePlaces: selectedZonePlaces,
  });
}

export function stateSelectionFingerprint(state: TripState) {
  return selectionFingerprint(state.activities, state.zonePlaces);
}

export function buildSyncManifest(
  state: TripState,
  revision: string,
  committedAt = new Date().toISOString(),
): SyncManifest {
  return {
    version: 1,
    revision,
    committedAt,
    counts: {
      days: state.days.length,
      activities: state.activities.length,
      hotels: state.hotels.length,
      purchases: state.purchases.length,
      reservations: state.reservations.length,
      sources: state.sources.length,
      library: state.library.length,
      zones: state.zones.length,
      zonePlaces: state.zonePlaces.length,
      routeSegments: state.routeSegments.length,
      documents: state.documents.length,
    },
    activityFingerprint: stateSelectionFingerprint(state),
    blackBoxUpdatedAt: state.activityBlackBox?.updatedAt ?? "",
    recoveryBaseline: CURRENT_RECOVERY_BASELINE,
  };
}

export function blackBoxIsNewer(
  local: ActivityBlackBox | null | undefined,
  remoteUpdatedAt: string | null | undefined,
) {
  if (!local?.updatedAt) return false;
  if (!remoteUpdatedAt) return true;
  return local.updatedAt.localeCompare(remoteUpdatedAt) > 0;
}
