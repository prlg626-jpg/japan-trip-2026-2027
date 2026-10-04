import type { Activity, Hotel, TripDay } from "../types";

export const JAPAN_TIMEZONE = "Asia/Tokyo";
export type TravelMode = "activities" | "clock";
export type RouteMode = "transit" | "walking";

export function japanClock(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: JAPAN_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { date: `${values.year}-${values.month}-${values.day}`, time: `${values.hour}:${values.minute}`, minutes: Number(values.hour) * 60 + Number(values.minute) };
}

export function isJapanDay(day: TripDay) {
  return /Osaka|Tokyo|Kyoto|Hakone|Nara|Kobe|Kioto|Tokio/i.test(day.city) && !/Bogot|México|Mexico|Vancouver|Montréal|Montreal/i.test(day.city);
}

export function travelDay(days: TripDay[], now = new Date()) {
  const date = japanClock(now).date;
  const ordered = [...days].sort((a, b) => a.date.localeCompare(b.date));
  return ordered.find((day) => day.date === date) ?? ordered.find((day) => isJapanDay(day) && day.date >= date) ?? [...ordered].reverse().find(isJapanDay) ?? ordered[0];
}

export function timeMinutes(time: string): number | null {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

export function travelFocus(activities: Activity[], day: TripDay, now: Date, mode: TravelMode, selectedId = "", skipped: string[] = []) {
  const pending = activities.filter((item) => item.included && item.status !== "completada" && !skipped.includes(item.id)).sort((a, b) => a.order - b.order);
  const selected = pending.find((item) => item.id === selectedId);
  if (selected) return selected;
  const clock = japanClock(now);
  // Preview dates and international flight days always use saved itinerary order.
  if (mode !== "clock" || day.date !== clock.date || !isJapanDay(day)) return pending[0] ?? null;
  const timed = pending.filter((item) => timeMinutes(item.start) !== null).sort((a, b) => timeMinutes(a.start)! - timeMinutes(b.start)! || a.order - b.order);
  const ongoing = timed.filter((item) => {
    const start = timeMinutes(item.start)!;
    const rawEnd = timeMinutes(item.end);
    const end = rawEnd !== null ? (rawEnd <= start ? rawEnd + 1440 : rawEnd) : start + (item.durationMinutes ?? item.estimatedDurationMinutes ?? 60);
    return start <= clock.minutes && clock.minutes < end;
  });
  if (ongoing.length) return ongoing[ongoing.length - 1];
  return timed.find((item) => timeMinutes(item.start)! >= clock.minutes) ?? pending[0] ?? null;
}

export function activityDestination(activity: Activity, city: string, hotel: Hotel | null = null): string {
  if (/regreso.*hotel|volver.*hotel/i.test(activity.title) && hotel) return hotel.address || `${hotel.name}, ${hotel.city}, Japan`;
  const transport = activity.category === "transport" || activity.kind === "transport" || activity.displayMode === "transport";
  let target = activity.address || activity.place;
  if (transport && /→|->/.test(activity.place)) target = activity.place.split(/→|->/).pop()!.trim();
  if (!target) {
    try {
      const url = new URL(activity.googleMapsUrl);
      if (["www.google.com", "maps.google.com", "google.com"].includes(url.hostname)) target = url.searchParams.get("destination") || url.searchParams.get("query") || url.searchParams.get("q") || "";
    } catch { /* Fall back to the saved place or coordinates. */ }
  }
  if (!target && activity.lat !== null && activity.lon !== null) return `${activity.lat},${activity.lon}`;
  target ||= activity.title;
  const japan = /Osaka|Tokyo|Kyoto|Hakone|Nara|Kobe|Kioto|Tokio/i.test(city);
  // A day's city is often the overnight base: arrival day is labelled Osaka,
  // but starts at Narita/Shinagawa. Never append that base to a different stop.
  return `${target}${japan && !/Japan|日本/i.test(target) ? ", Japan" : ""}`;
}

export function directionsUrl(destination: string, mode: RouteMode, origin = "") {
  const params = new URLSearchParams({ api: "1", destination, travelmode: mode, dir_action: "navigate" });
  if (origin) params.set("origin", origin);
  // Omitting origin lets Maps use the iPhone's current location, on demand.
  return `https://www.google.com/maps/dir/?${params}`;
}
