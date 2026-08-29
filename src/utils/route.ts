import type { Activity, Hotel, RouteSegment, ZonePlace } from "../types";

type Point = { id: string; title: string; lat: number | null; lon: number | null; type: "hotel" | "activity" | "zonePlace" };

export function distanceKm(a: Point, b: Point) {
  if (a.lat == null || a.lon == null || b.lat == null || b.lon == null) return null;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function googleRouteUrl(a: Point, b: Point) {
  const origin = a.lat != null && a.lon != null ? `${a.lat},${a.lon}` : a.title;
  const destination = b.lat != null && b.lon != null ? `${b.lat},${b.lon}` : b.title;
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;
}

export function estimateSegment(dayId: string, from: Point, to: Point): RouteSegment {
  const km = distanceKm(from, to);
  if (km == null) {
    return { id: `auto-${from.id}-${to.id}`, dayId, fromType: from.type, fromId: from.id, toType: to.type, toId: to.id, mode: "unknown", line: "Abrir ruta exacta", minutes: null, distanceKm: null, fareJPYPerPerson: null, fareJPYForTwo: null, sourceUrl: "", confidence: "estimated", googleMapsUrl: googleRouteUrl(from, to), lastVerified: "", userOverride: false };
  }
  if (km <= 1.2) {
    const minutes = Math.max(5, Math.round((km / 4.5) * 60 + 3));
    return { id: `auto-${from.id}-${to.id}`, dayId, fromType: from.type, fromId: from.id, toType: to.type, toId: to.id, mode: "walk", line: "A pie", minutes, distanceKm: Math.round(km * 10) / 10, fareJPYPerPerson: 0, fareJPYForTwo: 0, sourceUrl: "", confidence: "estimated", googleMapsUrl: googleRouteUrl(from, to), lastVerified: "", userOverride: false };
  }
  const minutes = Math.max(18, Math.round(10 + km * 4.2));
  const fare = km <= 6 ? 180 : km <= 12 ? 210 : 260;
  return { id: `auto-${from.id}-${to.id}`, dayId, fromType: from.type, fromId: from.id, toType: to.type, toId: to.id, mode: "metro", line: "Metro/JR sugerido · confirmar ruta", minutes, distanceKm: Math.round(km * 10) / 10, fareJPYPerPerson: fare, fareJPYForTwo: fare * 2, sourceUrl: "https://www.tokyometro.jp/lang_en/ticket/types/regular/index.html", confidence: "estimated", googleMapsUrl: googleRouteUrl(from, to), lastVerified: "2026-08-28", userOverride: false };
}

export function buildDayRoute(dayId: string, hotel: Hotel | null, activities: Activity[], places: ZonePlace[], curated: RouteSegment[]) {
  const selectedPlaces = places.filter((p) => p.selected).sort((a, b) => a.order - b.order);
  const points: Point[] = [];
  if (hotel && hotel.lat != null && hotel.lon != null) points.push({ id: hotel.id, title: hotel.name, lat: hotel.lat, lon: hotel.lon, type: "hotel" });
  activities.filter((a) => a.included && a.displayMode !== "flex-list").sort((a, b) => a.order - b.order).forEach((a) => points.push({ id: a.id, title: a.title, lat: a.lat, lon: a.lon, type: "activity" }));
  selectedPlaces.forEach((p) => points.push({ id: p.id, title: p.title, lat: p.lat, lon: p.lon, type: "zonePlace" }));
  const segments: RouteSegment[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const from = points[i]; const to = points[i + 1];
    const exact = curated.find((s) => s.dayId === dayId && s.fromId === from.id && s.toId === to.id);
    segments.push(exact ?? estimateSegment(dayId, from, to));
  }
  return { points, segments };
}
