import initialTrip from "../data/initialTrip.json";
import type { Activity, TripState } from "../types";

export function normalizeActivityV7(input: Partial<Activity> & Pick<Activity, "id" | "dayId" | "title">): Activity {
  const transport = input.displayMode === "transport" || input.category === "transport";
  return {
    id: input.id,
    dayId: input.dayId,
    order: input.order ?? 0,
    start: input.start ?? "",
    end: input.end ?? "",
    durationMinutes: input.durationMinutes ?? null,
    title: input.title,
    place: input.place ?? "",
    kind: input.kind ?? (transport ? "transport" : "experience"),
    lat: input.lat ?? null,
    lon: input.lon ?? null,
    bookingUrl: input.bookingUrl ?? "",
    googleMapsUrl: input.googleMapsUrl ?? "",
    legacyStatus: input.legacyStatus ?? "",
    status: input.status ?? "idea",
    note: input.note ?? "",
    priority: input.priority ?? false,
    included: input.included ?? true,
    flexible: input.flexible ?? true,
    fixed: input.fixed ?? false,
    sourceIds: input.sourceIds ?? [],
    costItemId: input.costItemId ?? null,
    estimatedCostCOP: input.estimatedCostCOP ?? 0,
    actualPaidCOP: input.actualPaidCOP ?? 0,
    description: input.description ?? input.note ?? "",
    zoneId: input.zoneId ?? null,
    displayMode: input.displayMode ?? (transport ? "transport" : "flex-list"),
    category: input.category ?? (transport ? "transport" : "experience"),
    subCategory: input.subCategory ?? "",
    tags: input.tags ?? [],
    priorityRank: input.priorityRank ?? "recommended",
    priceScope: input.priceScope ?? "unknown",
    priceLabel: input.priceLabel ?? "",
    priceOriginal: input.priceOriginal ?? null,
    totalForTwoCOP: input.totalForTwoCOP ?? null,
    priceVerifiedAt: input.priceVerifiedAt ?? "",
    priceSourceUrl: input.priceSourceUrl ?? "",
    priceDynamic: input.priceDynamic ?? false,
    estimatedDurationMinutes: input.estimatedDurationMinutes ?? input.durationMinutes ?? null,
    recommendedVisitMinutes: input.recommendedVisitMinutes ?? input.durationMinutes ?? null,
    address: input.address ?? input.place ?? "",
    nearestStation: input.nearestStation ?? "",
    openingHours: input.openingHours ?? "",
    holidayNote: input.holidayNote ?? "",
    reservationRequired: input.reservationRequired ?? false,
    bookingLabel: input.bookingLabel ?? (input.bookingUrl ? "Abrir" : ""),
    mustKeep: input.mustKeep ?? false,
    routeStrategy: input.routeStrategy ?? (transport ? "ordered" : "flexible"),
  };
}

export function migrateStoredState(stored: TripState): TripState {
  if (stored.schemaVersion >= 7 && stored.zones && stored.zonePlaces && stored.documents) return stored;
  const base = structuredClone(initialTrip as TripState);
  // Preserve user-generated financial/history data that is safe to carry forward.
  if (stored.purchases?.length) base.purchases = stored.purchases;
  if (stored.settings?.fx) base.settings.fx = stored.settings.fx;
  if (stored.settings?.authorizedUserEmails) base.settings.authorizedUserEmails = stored.settings.authorizedUserEmails;
  base.notes = { ...base.notes, ...(stored.notes ?? {}) };
  return base;
}
