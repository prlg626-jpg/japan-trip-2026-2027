import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Activity, Hotel, TripDay } from "../types";

interface MapViewProps {
  activities: Activity[];
  hotels?: Hotel[];
  day?: TripDay | null;
  height?: string;
}

function markerHtml(label: string, className = "") {
  return L.divIcon({
    className: "",
    html: `<div class="mapMarker ${className}">${label}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

export function MapView({ activities, hotels = [], day = null, height = "420px" }: MapViewProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
    const points = [
      ...hotels.filter((hotel) => hotel.lat != null && hotel.lon != null).map((hotel) => [hotel.lat!, hotel.lon!] as [number, number]),
      ...activities
        .filter((activity) => activity.included && activity.lat != null && activity.lon != null)
        .map((activity) => [activity.lat!, activity.lon!] as [number, number]),
    ];
    const center = points[0] ?? [35.6812, 139.7671];
    const map = L.map(ref.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView(center, points.length > 1 ? 12 : 10);
    mapRef.current = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    hotels.forEach((hotel) => {
      if (hotel.lat == null || hotel.lon == null) return;
      L.marker([hotel.lat, hotel.lon], { icon: markerHtml("H", "hotel") })
        .addTo(map)
        .bindPopup(`<strong>${hotel.name}</strong><br>${hotel.city}<br>${hotel.address ?? ""}`);
    });

    const activityPoints: [number, number][] = [];
    activities
      .filter((activity) => activity.included && activity.lat != null && activity.lon != null)
      .forEach((activity, index) => {
        const point: [number, number] = [activity.lat!, activity.lon!];
        activityPoints.push(point);
        L.marker(point, { icon: markerHtml(String(index + 1)) })
          .addTo(map)
          .bindPopup(
            `<strong>${activity.start ? `${activity.start} · ` : ""}${activity.title}</strong><br>${activity.place}<br>${activity.legacyStatus}`,
          );
      });

    if (day && activityPoints.length > 1) {
      L.polyline(activityPoints, {
        color: "#6755ee",
        weight: 3,
        opacity: 0.65,
        dashArray: "6 7",
      }).addTo(map);
    }

    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [36, 36] });
    }

    window.setTimeout(() => map.invalidateSize(), 100);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [activities, hotels, day]);

  return <div className="mapCanvas" ref={ref} style={{ height }} />;
}
