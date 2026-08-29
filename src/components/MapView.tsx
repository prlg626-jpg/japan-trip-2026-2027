import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Activity, Hotel, RouteSegment, TripDay, ZonePlace } from "../types";

interface MapViewProps {
  activities: Activity[];
  hotels?: Hotel[];
  day?: TripDay | null;
  zonePlaces?: ZonePlace[];
  routeSegments?: RouteSegment[];
  height?: string;
}

function markerHtml(label: string, className = "") {
  return L.divIcon({ className: "", html: `<div class="mapMarker ${className}">${label}</div>`, iconSize: [34, 34], iconAnchor: [17, 17] });
}
function categoryIcon(category:string){ return ({food:"🍜",cafe:"☕",shopping:"🛍",anime:"🎮",gaming:"🎮",museum:"🏛",nature:"🌿",market:"🥢",tourism:"📍",explore:"🚶",experience:"✨"} as Record<string,string>)[category] ?? "•"; }

export function MapView({ activities, hotels = [], day = null, zonePlaces = [], routeSegments = [], height = "420px" }: MapViewProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    const activeActivities = activities.filter((activity) => activity.included && activity.lat != null && activity.lon != null);
    const selectedPlaces = zonePlaces.filter((p) => p.selected && p.lat != null && p.lon != null).sort((a,b)=>a.order-b.order);
    const candidatePlaces = zonePlaces.filter((p) => !p.selected && p.lat != null && p.lon != null);
    const points = [
      ...hotels.filter((hotel) => !hotel.archived && hotel.lat != null && hotel.lon != null).map((hotel) => [hotel.lat!, hotel.lon!] as [number, number]),
      ...activeActivities.map((activity) => [activity.lat!, activity.lon!] as [number, number]),
      ...zonePlaces.filter((p)=>p.lat!=null&&p.lon!=null).map((p)=>[p.lat!,p.lon!] as [number,number]),
    ];
    const center = points[0] ?? [35.6812, 139.7671];
    const map = L.map(ref.current, { zoomControl: true, attributionControl: true }).setView(center, points.length > 1 ? 12 : 10);
    mapRef.current = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(map);

    hotels.filter(h=>!h.archived).forEach((hotel) => {
      if (hotel.lat == null || hotel.lon == null) return;
      L.marker([hotel.lat, hotel.lon], { icon: markerHtml("H", "hotel") }).addTo(map).bindPopup(`<strong>${hotel.name}</strong><br>${hotel.city}<br>${hotel.address ?? ""}`);
    });

    activeActivities.forEach((activity, index) => {
      const point: [number, number] = [activity.lat!, activity.lon!];
      L.marker(point, { icon: markerHtml(String(index + 1), `category-${activity.category}`) }).addTo(map).bindPopup(`<strong>${index+1}. ${activity.title}</strong><br>${activity.place}<br>${activity.description || ""}`);
    });
    selectedPlaces.forEach((place,index)=>{
      const number=activeActivities.length+index+1;
      L.marker([place.lat!,place.lon!],{icon:markerHtml(String(number),`category-${place.category}`)}).addTo(map).bindPopup(`<strong>${number}. ${place.title}</strong><br>${place.description}`);
    });
    candidatePlaces.forEach((place)=>{
      L.marker([place.lat!,place.lon!],{icon:markerHtml(categoryIcon(place.category),"candidate")}).addTo(map).bindPopup(`<strong>${place.title}</strong><br>${place.description}<br><em>Opción no seleccionada</em>`);
    });

    if (day && routeSegments.length) {
      const pointById = new Map<string,[number,number]>();
      hotels.forEach(h=>{if(h.lat!=null&&h.lon!=null) pointById.set(h.id,[h.lat,h.lon]);});
      activeActivities.forEach(a=>pointById.set(a.id,[a.lat!,a.lon!]));
      selectedPlaces.forEach(p=>pointById.set(p.id,[p.lat!,p.lon!]));
      routeSegments.forEach(seg=>{
        const a=pointById.get(seg.fromId); const b=pointById.get(seg.toId);
        if(a&&b) L.polyline([a,b],{color:"#6755ee",weight:3,opacity:.65,dashArray:"6 7"}).addTo(map);
      });
    }
    if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [36, 36] });
    window.setTimeout(() => map.invalidateSize(), 100);
    return () => { map.remove(); mapRef.current = null; };
  }, [activities, hotels, day, zonePlaces, routeSegments]);

  return <div className="mapCanvas" ref={ref} style={{ height }} />;
}
