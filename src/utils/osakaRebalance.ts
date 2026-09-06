import type { TripState } from "../types";

const DAY_28 = "2026-12-28";
const DAY_31 = "2026-12-31";
const NAKANOSHIMA_ZONE = "osaka-nakanoshima";

/**
 * Keeps the Osaka year-end plan balanced without creating avoidable cross-city hops.
 *
 * Route logic for Dec 31 is intentionally north-to-south:
 * Nakanoshima / Kitahama -> Midosuji -> matcha near Shinsaibashi -> NYE dinner.
 * The function is idempotent so it can safely run for initial, localStorage and
 * Firestore-loaded state.
 */
export function rebalanceOsakaYearEnd(state: TripState): TripState {
  const copy = structuredClone(state);

  const day28 = copy.days.find((day) => day.id === DAY_28);
  const day31 = copy.days.find((day) => day.id === DAY_31);
  const matcha = copy.activities.find((activity) => activity.id === "v7-28-matcha");
  const nyeDinner = copy.activities.find((activity) => activity.id === "v7-31-nye");

  if (matcha) {
    matcha.dayId = DAY_31;
    matcha.order = 0;
    matcha.start = "15:00";
    matcha.end = "16:00";
    matcha.zoneId = NAKANOSHIMA_ZONE;
    matcha.place = "Midosuji / Shinsaibashi";
    matcha.description =
      "Experiencia para preparar matcha en inglés, colocada al final del recorrido sur por Midosuji para evitar volver a Minami otro día.";
    matcha.note =
      "Confirmar disponibilidad específica del 31 de diciembre antes de reservar; si el operador cierra por Año Nuevo, mantenerla como alternativa flexible.";
  }

  if (nyeDinner) {
    nyeDinner.order = 1;
  }

  if (day28) {
    day28.pace = "Medio / flexible";
    day28.summary =
      "Pokémon Cafe + Rikuro + taller de palillos, concentrados en Shinsaibashi, Dotonbori y Namba sin apretar la tarde.";
    day28.why =
      "Se deja Minami compacto y se mueve el matcha al corredor del 31 para repartir mejor la carga sin repetir traslados.";
    day28.routeNote =
      "Mantenerse en Minami: Shinsaibashi -> Dotonbori -> Namba. Rikuro funciona como parada flexible entre actividades.";
  }

  if (day31) {
    day31.pace = "Relajado / medio";
    day31.title = "Nakanoshima → Kitahama → Midosuji + Nochevieja";
    day31.summary =
      "Paseo de río y cafés, recorrido hacia el sur por Midosuji, matcha por la tarde y cena especial de Nochevieja.";
    day31.why =
      "El día queda más completo, pero sigue una sola dirección: Nakanoshima/Kitahama -> Midosuji -> Shinsaibashi, evitando ir y volver entre zonas.";
    day31.routeNote =
      "Recorrido lineal de norte a sur. Todo comercio, taller y restaurante queda sujeto a horarios especiales del 31 de diciembre.";
  }

  const selectOn31 = new Set(["zp-nakanoshima31", "zp-kitahama-cafes", "zp-midosuji"]);
  copy.zonePlaces.forEach((place) => {
    if (selectOn31.has(place.id)) {
      place.selected = true;
      place.suggestedDayId = DAY_31;
    }
  });

  return copy;
}
