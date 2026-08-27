import type { Activity, LibraryItem, TripDay, TripState } from "../types";

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function sortedDays(state: TripState): TripDay[] {
  return [...state.days].sort((a, b) => a.date.localeCompare(b.date));
}

export function activitiesForDay(state: TripState, dayId: string): Activity[] {
  return state.activities
    .filter((activity) => activity.dayId === dayId)
    .sort((a, b) => a.order - b.order || a.start.localeCompare(b.start));
}

export function activeActivitiesForDay(state: TripState, dayId: string): Activity[] {
  return activitiesForDay(state, dayId).filter((activity) => activity.included);
}

export function getDay(state: TripState, dayId: string) {
  return state.days.find((day) => day.id === dayId) ?? state.days[0];
}

export function getHotelForDay(state: TripState, dayId: string) {
  const day = getDay(state, dayId);
  return state.hotels.find((hotel) => hotel.id === day?.hotelId) ?? null;
}

export function nextTravelDay(state: TripState): TripDay {
  const today = todayIso();
  return (
    sortedDays(state).find((day) => day.date >= today) ??
    sortedDays(state)[sortedDays(state).length - 1]
  );
}

export function nextActivityForDay(state: TripState, dayId: string): Activity | null {
  const now = new Date();
  const today = todayIso();
  const activities = activeActivitiesForDay(state, dayId);
  if (dayId !== today) return activities[0] ?? null;
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  return (
    activities.find((activity) => minutes(activity.start) >= minutesNow) ??
    activities[activities.length - 1] ??
    null
  );
}

export function minutes(time: string): number {
  if (!/^\d{2}:\d{2}$/.test(time)) return 0;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function countdownLabel(dayId: string, start: string): string {
  if (!start) return "sin hora";
  const target = new Date(`${dayId}T${start}:00`);
  const diffMs = target.getTime() - Date.now();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < -30) return "ya empezó";
  if (diffMin < 0) return "empezando";
  if (diffMin < 60) return `en ${diffMin} min`;
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  return `en ${hours} h ${mins ? `${mins} min` : ""}`.trim();
}

export function normalizeOrders(state: TripState): TripState {
  const copy = structuredClone(state);
  for (const day of copy.days) {
    copy.activities
      .filter((activity) => activity.dayId === day.id)
      .sort((a, b) => a.order - b.order || a.start.localeCompare(b.start))
      .forEach((activity, index) => {
        activity.order = index;
      });
    day.activityIds = copy.activities
      .filter((activity) => activity.dayId === day.id)
      .sort((a, b) => a.order - b.order)
      .map((activity) => activity.id);
  }
  return copy;
}

export function libraryToActivity(item: LibraryItem, dayId: string, order: number): Activity {
  return {
    id: `${item.id}-${Date.now()}`,
    dayId,
    order,
    start: item.start ?? "",
    end: item.end ?? "",
    durationMinutes: null,
    title: item.title,
    place: item.place,
    kind: item.kind,
    lat: item.lat,
    lon: item.lon,
    bookingUrl: item.bookingUrl,
    googleMapsUrl: item.googleMapsUrl,
    legacyStatus: item.legacyStatus,
    status: "idea",
    note: item.note,
    priority: item.priority,
    included: true,
    flexible: true,
    fixed: false,
    sourceIds: item.sourceIds,
    costItemId: null,
    estimatedCostCOP: 0,
    actualPaidCOP: 0,
  };
}

export function statusLabel(status: Activity["status"]) {
  const labels: Record<Activity["status"], string> = {
    idea: "Idea",
    pendiente_de_reservar: "Pendiente",
    reservada: "Reservada",
    pagada: "Pagada",
    completada: "Completada",
  };
  return labels[status];
}

export function cityClass(city: string) {
  if (city.includes("Osaka")) return "city-osaka";
  if (city.includes("Kyoto")) return "city-kyoto";
  if (city.includes("Hakone")) return "city-hakone";
  if (city.includes("Tokyo")) return "city-tokyo";
  return "city-flight";
}
