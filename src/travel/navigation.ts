import type { Activity, Hotel } from "../types";

export type TravelMode = "walking" | "transit" | "driving";

export interface Coordinates {
  lat: number;
  lon: number;
  accuracy?: number;
}

export function distanceMeters(
  from: Coordinates,
  to: Pick<Coordinates, "lat" | "lon">,
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6_371_000;
  const dLat = toRad(to.lat - from.lat);
  const dLon = toRad(to.lon - from.lon);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * earthRadius * Math.asin(Math.sqrt(h));
}

export function formatDistance(meters: number | null) {
  if (meters == null || !Number.isFinite(meters)) return "";
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} m`;
  return `${(meters / 1000).toFixed(meters < 10_000 ? 1 : 0)} km`;
}

function destinationFor(
  item: Pick<Activity, "title" | "place" | "lat" | "lon"> | Hotel,
) {
  if (item.lat != null && item.lon != null) return `${item.lat},${item.lon}`;
  const name = "title" in item ? item.title : item.name;
  const place = "place" in item ? item.place : item.address;
  return [name, place].filter(Boolean).join(" ");
}

export function googleMapsDirectionsUrl(
  item: Pick<Activity, "title" | "place" | "lat" | "lon"> | Hotel,
  mode: TravelMode = "transit",
) {
  const destination = destinationFor(item);
  const params = new URLSearchParams({
    api: "1",
    destination,
    travelmode: mode,
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function appleMapsDirectionsUrl(
  item: Pick<Activity, "title" | "place" | "lat" | "lon"> | Hotel,
  mode: TravelMode = "transit",
) {
  const destination = destinationFor(item);
  const dirflg = mode === "walking" ? "w" : mode === "driving" ? "d" : "r";
  return `https://maps.apple.com/?daddr=${encodeURIComponent(destination)}&dirflg=${dirflg}`;
}

export function modeForActivity(activity: Activity): TravelMode {
  const text = `${activity.category} ${activity.kind} ${activity.title}`.toLowerCase();
  if (/taxi|car|drive/.test(text)) return "driving";
  if (/walk|paseo/.test(text)) return "walking";
  return "transit";
}

export function activityCoordinates(activity: Activity) {
  if (activity.lat == null || activity.lon == null) return null;
  return { lat: activity.lat, lon: activity.lon };
}
