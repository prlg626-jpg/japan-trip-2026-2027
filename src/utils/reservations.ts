import type { Activity, Reservation, TripState } from "../types";
import { activityEstimate } from "./money";
import { bookingReleaseForActivity } from "./bookingCalendar2026";

const LEGACY_ACTIVITY_ALIASES: Record<string, string> = {
  "d26-pokecafe": "v7-28-pokecafe",
  "d26-chopsticks": "v7-28-chopsticks",
  "d26-matcha": "v7-28-matcha",
  "d31-nye": "v7-31-nye",
  "d3-jins": "v7-6-jins",
  "d5-perfume": "v7-5-perfume",
  "d6-pillow": "jan8-suggestion-zp-pillow",
  "d8-brother": "v7-8-brother",
};

const COST_ALIASES: Record<string, string> = {
  "v7-28-chopsticks": "d26-chopsticks",
  "v7-28-matcha": "d26-matcha",
  "v7-5-perfume": "d5-perfume",
  "v7-6-jins": "d3-jins",
  "v7-8-brother": "d8-brother",
  "jan8-suggestion-zp-pillow": "d6-pillow",
};

function costForActivity(state: TripState, activity: Activity) {
  const alias = COST_ALIASES[activity.id];
  return state.costs.find(
    (cost) =>
      cost.activityId === activity.id ||
      cost.id === activity.costItemId ||
      cost.id === alias,
  );
}

function bookingLinkForActivity(state: TripState, activity: Activity) {
  return activity.bookingUrl || costForActivity(state, activity)?.link || "";
}

function finishedStatus(value: string) {
  return /comprado|pagado|reservado|completado/i.test(value || "");
}

function activityAlreadyPurchased(state: TripState, activity: Activity) {
  return state.purchases.some(
    (purchase) =>
      purchase.activityId === activity.id &&
      (purchase.status === "Pagado" || purchase.status === "Reservado"),
  );
}

function resolveActiveActivity(
  activeById: Map<string, Activity>,
  reservation: Reservation,
) {
  if (!reservation.activityId) return null;
  const direct = activeById.get(reservation.activityId);
  if (direct) return direct;
  const alias = LEGACY_ACTIVITY_ALIASES[reservation.activityId];
  return alias ? activeById.get(alias) ?? null : null;
}

/**
 * "Qué ya se puede reservar" is a view of the live itinerary, not a second
 * agenda. Stored reservation metadata is reused only when its activity is
 * currently active. Newly selected reservable activities get a virtual row
 * automatically and can later be edited into a persisted reservation.
 */
export function selectedBookableReservations(state: TripState): Reservation[] {
  const active = state.activities.filter((activity) => activity.included);
  const activeById = new Map(active.map((activity) => [activity.id, activity]));
  const represented = new Set<string>();
  const rows: Reservation[] = [];

  state.reservations.forEach((reservation) => {
    const activity = resolveActiveActivity(activeById, reservation);
    if (!activity) return;
    represented.add(activity.id);

    if (
      finishedStatus(reservation.currentStatus) ||
      activity.status === "reservada" ||
      activity.status === "pagada" ||
      activity.status === "completada" ||
      activityAlreadyPurchased(state, activity)
    ) return;

    const link = bookingLinkForActivity(state, activity) || reservation.link;
    if (!link) return;

    const release = bookingReleaseForActivity(activity.id);
    rows.push({
      ...reservation,
      activityId: activity.id,
      travelDate: activity.dayId,
      name: reservation.name || activity.title,
      opens: release?.label || reservation.opens,
      estimatedPriceCOP:
        reservation.estimatedPriceCOP > 0
          ? reservation.estimatedPriceCOP
          : activityEstimate(activity, state),
      link,
      reminderNotes: release?.note || reservation.reminderNotes,
      bookingCheckDate: release?.checkDate,
      bookingCheckLabel: release?.label,
      bookingConfidence: release?.confidence,
      bookingSourceUrl: release?.sourceUrl,
    });
  });

  active.forEach((activity) => {
    if (represented.has(activity.id)) return;
    const cost = costForActivity(state, activity);
    const link = bookingLinkForActivity(state, activity);
    if (!link) return;
    if (
      activity.status === "reservada" ||
      activity.status === "pagada" ||
      activity.status === "completada" ||
      activityAlreadyPurchased(state, activity)
    ) return;

    const release = bookingReleaseForActivity(activity.id);
    rows.push({
      id: `auto-${activity.id}`,
      activityId: activity.id,
      travelDate: activity.dayId,
      name: activity.title,
      currentStatus: cost?.reservationStatus || "POR RESERVAR",
      opens: release?.label || cost?.opens || "Revisar disponibilidad",
      estimatedPriceCOP: activityEstimate(activity, state),
      link,
      provider: cost?.link ? "Fuente de reserva/precio" : "Desde actividad seleccionada",
      reminderNotes:
        release?.note ||
        cost?.note ||
        activity.holidayNote ||
        activity.note ||
        "Esta reserva aparece automáticamente porque la actividad está activa.",
      bookingCheckDate: release?.checkDate,
      bookingCheckLabel: release?.label,
      bookingConfidence: release?.confidence,
      bookingSourceUrl: release?.sourceUrl,
    });
  });

  const orderByActivity = new Map(active.map((activity) => [activity.id, activity.order]));
  rows.sort(
    (a, b) =>
      a.travelDate.localeCompare(b.travelDate) ||
      (orderByActivity.get(a.activityId ?? "") ?? 999) -
        (orderByActivity.get(b.activityId ?? "") ?? 999) ||
      a.name.localeCompare(b.name),
  );

  return rows;
}
