import { ExternalLink, Footprints, TrainFront } from "lucide-react";
import type { RouteSegment } from "../types";

function modeLabel(mode: RouteSegment["mode"]) {
  return ({ walk: "A pie", metro: "Metro/JR", jr: "JR", bus: "Bus", shuttle: "Shuttle", taxi: "Taxi", shinkansen: "Shinkansen", unknown: "Por confirmar" } as const)[mode];
}

export function RouteSummary({ segments, nameForId }: { segments: RouteSegment[]; nameForId: (id: string) => string }) {
  const totalMinutes = segments.reduce((sum, item) => sum + (item.minutes ?? 0), 0);
  const totalFare = segments.reduce((sum, item) => sum + (item.fareJPYForTwo ?? 0), 0);
  if (!segments.length) return <div className="routeSummary empty">Selecciona puntos de la zona para estimar la ruta.</div>;
  return (
    <section className="routeSummary">
      <div className="routeSummaryHead">
        <div><span>Ruta activa</span><strong>{segments.length} tramos · ≈ {totalMinutes} min · ≈ ¥{totalFare.toLocaleString("es-CO")} para dos</strong></div>
        <small>Los tramos marcados “aprox.” son estimaciones; abre Maps para la ruta exacta.</small>
      </div>
      <div className="routeSegmentList">
        {segments.map((segment, index) => (
          <article className="routeSegment" key={segment.id + index}>
            <span className="routeMode">{segment.mode === "walk" ? <Footprints size={16}/> : <TrainFront size={16}/>} {modeLabel(segment.mode)}</span>
            <div><strong>{nameForId(segment.fromId)} → {nameForId(segment.toId)}</strong><small>{segment.distanceKm != null ? `${segment.distanceKm} km · ` : ""}{segment.minutes != null ? `≈ ${segment.minutes} min` : "tiempo por confirmar"} · {segment.fareJPYForTwo != null ? `≈ ¥${segment.fareJPYForTwo.toLocaleString("es-CO")} / 2` : "tarifa por confirmar"}</small></div>
            {segment.googleMapsUrl ? <a href={segment.googleMapsUrl} target="_blank" rel="noreferrer" aria-label="Abrir ruta"><ExternalLink size={16}/></a> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
