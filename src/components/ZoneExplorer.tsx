import { useEffect, useMemo, useState } from "react";
import { ExternalLink, MapPin } from "lucide-react";
import type { MoneyOriginal, Zone, ZonePlace } from "../types";
import { visualGroupForZonePlace } from "../utils/itineraryIntelligence";
import "../v8.css";

const categoryNames: Record<string, string> = {
  explore: "Paseo / barrio",
  tourism: "Lugar turístico",
  experience: "Experiencia",
  museum: "Museo",
  anime: "Anime / gaming",
  gaming: "Gaming",
  shopping: "Compras",
  nature: "Naturaleza",
  market: "Mercado",
  food: "Restaurante",
  cafe: "Café",
};

const JPY_COP = 19.3465;
const USD_COP = 3071.41;

function cop(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function priceCOP(original: MoneyOriginal | null, scope: string, label: string) {
  if (!original || !original.unit) {
    if (/gratis/i.test(label)) return "Gratis";
    return label || "Precio por verificar";
  }
  const unit =
    original.currency === "JPY"
      ? original.unit * JPY_COP
      : original.currency === "USD"
        ? original.unit * USD_COP
        : original.unit;
  const qty = scope === "per_person" ? 2 : original.quantity || 1;
  const suffix =
    scope === "per_person"
      ? "aprox. para los dos"
      : scope === "per_item"
        ? "por producto"
        : scope === "for_two"
          ? "para los dos"
          : "aprox.";
  return `${cop(unit * qty)} · ${suffix}`;
}

export function ZoneExplorer({
  zones,
  places,
  onAdd,
  dayLabel,
}: {
  zones: Zone[];
  places: ZonePlace[];
  onAdd: (place: ZonePlace) => void;
  dayLabel: string;
}) {
  const [filter, setFilter] = useState("all");
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "all");
  const zoneKey = zones.map((zone) => zone.id).join("|");

  useEffect(() => {
    if (!zones.some((zone) => zone.id === zoneId)) {
      setZoneId(zones[0]?.id ?? "all");
    }
    setFilter("all");
  }, [zoneKey]);

  const activeZone = zones.find((zone) => zone.id === zoneId) ?? zones[0];
  const zonePlaces = places.filter(
    (place) => !activeZone || place.zoneId === activeZone.id,
  );
  const categories = useMemo(
    () => Array.from(new Set(zonePlaces.map((place) => place.category))).sort(),
    [zonePlaces],
  );
  const visible = zonePlaces.filter(
    (place) =>
      filter === "all" ||
      place.category === filter ||
      (filter === "essential" && place.priorityRank === "essential"),
  );

  if (!zones.length || !places.length) return null;

  return (
    <section className="zoneExplorer candidateExplorer">
      <header className="zoneHeader">
        <span>También encaja aquí</span>
        <h3>{activeZone?.name ?? "Opciones cercanas"}</h3>
        <p>
          Estas tarjetas no están seleccionadas. Pueden aparecer en más de un día
          compatible; al añadir una, se asigna a este día y desaparece de las demás
          sugerencias.
        </p>
        {zones.length > 1 ? (
          <div className="zoneSelector">
            {zones.map((zone) => (
              <button
                type="button"
                key={zone.id}
                className={zoneId === zone.id ? "active" : ""}
                onClick={() => setZoneId(zone.id)}
              >
                {zone.name}
              </button>
            ))}
          </div>
        ) : null}
      </header>

      <div className="filterStrip">
        <button
          type="button"
          className={filter === "all" ? "active" : ""}
          onClick={() => setFilter("all")}
        >
          Todo ({zonePlaces.length})
        </button>
        <button
          type="button"
          className={filter === "essential" ? "active" : ""}
          onClick={() => setFilter("essential")}
        >
          Imperdibles
        </button>
        {categories.map((category) => (
          <button
            type="button"
            key={category}
            className={filter === category ? "active" : ""}
            onClick={() => setFilter(category)}
          >
            {categoryNames[category] ?? category}
          </button>
        ))}
      </div>

      <div className="zonePlaceList">
        {visible.map((place) => (
          <article
            key={place.id}
            className={`zonePlaceCard visual-${visualGroupForZonePlace(place)}`}
          >
            <div className="zonePlaceTitle">
              <div>
                <span className="placeType">
                  {categoryNames[place.category] ?? place.category}
                </span>
                <h4>{place.title}</h4>
              </div>
              {place.reservationRequired ? (
                <span className="reservationBadge">Reserva</span>
              ) : null}
            </div>
            <p className="placeDescription">
              <strong>Qué es:</strong> {place.description}
            </p>
            <div className="placeMeta">
              {place.nearestStation ? <span>🚉 {place.nearestStation}</span> : null}
              <span>
                ⏱ {place.estimatedDurationMinutes ? `≈ ${place.estimatedDurationMinutes} min` : "a tu ritmo"}
              </span>
              <span className="placePrice">
                💰 {priceCOP(place.priceOriginal, place.priceScope, place.priceLabel)}
              </span>
              {place.ratingContext ? <span>⭐ {place.ratingContext}</span> : null}
            </div>
            {place.holidayNote ? (
              <p className="warningText">⚠ {place.holidayNote}</p>
            ) : null}
            <button
              className="selectPlaceBig"
              type="button"
              onClick={() => onAdd(place)}
            >
              + Añadir a {dayLabel}
            </button>
            <div className="actionRow">
              {place.officialUrl ? (
                <a
                  className="chipButton"
                  href={place.officialUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={14} />
                  Ver sitio
                </a>
              ) : null}
              <a
                className="chipButton"
                href={place.googleMapsUrl}
                target="_blank"
                rel="noreferrer"
              >
                <MapPin size={14} />
                Cómo llegar
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
