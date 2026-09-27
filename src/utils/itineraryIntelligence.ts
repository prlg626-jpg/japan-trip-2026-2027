import type { Activity, TripState, ZonePlace } from "../types";
import { inferMealSlot } from "./mealSlots";

export type VisualGroup = "activity" | "shopping" | "culture" | "food" | "travel";

const BALANCE_MIGRATION_KEY = "itinerary-balance-2026-09-27-v1";

function normalizedText(item: {
  title?: string;
  category?: string;
  kind?: string;
  subCategory?: string;
}) {
  return `${item.title ?? ""} ${item.category ?? ""} ${item.kind ?? ""} ${item.subCategory ?? ""}`.toLowerCase();
}

export function visualGroupForActivity(activity: Activity): VisualGroup {
  const text = normalizedText(activity);
  if (/transport|transfer|flight|hotel|rest|shinkansen|airport|check-?in|tren|vuelo/.test(text)) return "travel";
  if (/food|restaurant|cafe|café|meal|breakfast|lunch|dinner|snack|brunch|matcha|ramen|soba|takoyaki|okonomiyaki|cheesecake|market/.test(text)) return "food";
  if (
    activity.category === "shopping" ||
    /shopping|store|shop|uniqlo|\bgu\b|jins|onitsuka|yodobashi|don quijote|parco|pokemon center|nintendo|tsutaya|grounds|fitting salon/.test(text)
  ) return "shopping";
  if (/museum|tourism|nature|explore|church|garden|park|river|observatory|bridge|culture/.test(text)) return "culture";
  return "activity";
}

export function visualGroupForZonePlace(place: ZonePlace): VisualGroup {
  const text = normalizedText({
    title: place.title,
    category: place.category,
    subCategory: place.subCategory,
  });
  if (/transport|transfer|flight|hotel/.test(text)) return "travel";
  if (/food|restaurant|cafe|café|meal|breakfast|lunch|dinner|snack|brunch|matcha|ramen|soba|takoyaki|okonomiyaki|cheesecake|market/.test(text)) return "food";
  if (
    place.category === "shopping" ||
    /shopping|store|shop|uniqlo|\bgu\b|jins|onitsuka|yodobashi|don quijote|parco|pokemon center|nintendo|tsutaya|grounds|fitting salon/.test(text)
  ) return "shopping";
  if (/museum|tourism|nature|explore|church|garden|park|river|observatory|bridge|culture/.test(text)) return "culture";
  return "activity";
}

function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * r * Math.asin(Math.sqrt(h));
}

function sameCity(dayCity: string, zoneCity: string) {
  const day = dayCity.toLowerCase();
  const zone = zoneCity.toLowerCase();
  return day.includes(zone) || zone.includes(day);
}

export function candidateZonePlacesForDay(state: TripState, dayId: string): ZonePlace[] {
  const day = state.days.find((item) => item.id === dayId);
  if (!day) return [];

  const zoneById = new Map(state.zones.map((zone) => [zone.id, zone]));
  const active = state.activities.filter((activity) => activity.dayId === dayId && activity.included);
  const activePoints = active.filter(
    (activity): activity is Activity & { lat: number; lon: number } =>
      activity.lat != null && activity.lon != null,
  );
  const dayZoneIds = new Set(day.zoneIds ?? []);

  const ranked = state.zonePlaces
    .filter((place) => !place.selected)
    .map((place) => {
      const zone = zoneById.get(place.zoneId);
      const explicitDay = place.suggestedDayId === dayId;
      const dayZone = dayZoneIds.has(place.zoneId);
      const recommendedDay = Boolean(zone?.recommendedDayIds.includes(dayId));

      let proximity = Number.POSITIVE_INFINITY;
      if (
        zone &&
        sameCity(day.city, zone.city) &&
        place.lat != null &&
        place.lon != null &&
        activePoints.length
      ) {
        proximity = Math.min(
          ...activePoints.map((activity) =>
            distanceKm(place.lat as number, place.lon as number, activity.lat, activity.lon),
          ),
        );
      }

      // 3.6 km is intentionally conservative: it surfaces genuinely nearby
      // alternatives without turning every Tokyo day into the whole city.
      const nearby = proximity <= 3.6;
      if (!explicitDay && !dayZone && !recommendedDay && !nearby) return null;

      const priority =
        place.priorityRank === "essential"
          ? 0
          : place.priorityRank === "recommended"
            ? 1
            : place.priorityRank === "nearby"
              ? 2
              : 3;
      const fitScore = dayZone ? 0 : recommendedDay ? 0.25 : explicitDay ? 0.5 : proximity;
      return { place, priority, fitScore };
    })
    .filter((entry): entry is { place: ZonePlace; priority: number; fitScore: number } => Boolean(entry));

  ranked.sort(
    (a, b) =>
      a.fitScore - b.fitScore ||
      a.priority - b.priority ||
      a.place.order - b.place.order ||
      a.place.title.localeCompare(b.place.title),
  );
  return ranked.map((entry) => entry.place);
}

export function bestGeographicInsertionIndex(
  active: Activity[],
  lat: number | null | undefined,
  lon: number | null | undefined,
) {
  if (lat == null || lon == null || !active.length) return active.length;

  const ordered = [...active].sort((a, b) => a.order - b.order);
  let bestIndex = ordered.length;
  let bestDelta = Number.POSITIVE_INFINITY;

  for (let index = 0; index <= ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const next = ordered[index];
    const prevOk = previous?.lat != null && previous?.lon != null;
    const nextOk = next?.lat != null && next?.lon != null;

    if (!prevOk && !nextOk) continue;

    const toPrevious = prevOk
      ? distanceKm(previous.lat as number, previous.lon as number, lat, lon)
      : 0;
    const toNext = nextOk
      ? distanceKm(lat, lon, next.lat as number, next.lon as number)
      : 0;
    const replaced = prevOk && nextOk
      ? distanceKm(
          previous.lat as number,
          previous.lon as number,
          next.lat as number,
          next.lon as number,
        )
      : 0;
    const delta = toPrevious + toNext - replaced;

    if (delta < bestDelta) {
      bestDelta = delta;
      bestIndex = index;
    }
  }

  return bestIndex;
}

export function estimatedDayMinutes(state: TripState, dayId: string) {
  const active = state.activities
    .filter((activity) => activity.dayId === dayId && activity.included)
    .sort((a, b) => a.order - b.order);

  const activityMinutes = active.reduce((sum, activity) => {
    const known =
      activity.estimatedDurationMinutes ??
      activity.recommendedVisitMinutes ??
      activity.durationMinutes;
    if (known && known > 0) return sum + known;

    const group = visualGroupForActivity(activity);
    if (group === "travel") return sum + 75;
    if (group === "food") return sum + 70;
    if (group === "shopping") return sum + 45;
    if (group === "culture") return sum + 60;
    return sum + 75;
  }, 0);

  // Light transfer allowance between cards. It is an itinerary load signal,
  // not a promise about exact journey time.
  return activityMinutes + Math.max(0, active.length - 1) * 15;
}

function setActivityDay(state: TripState, activityId: string, dayId: string) {
  const activity = state.activities.find((item) => item.id === activityId);
  if (activity) activity.dayId = dayId;
}

function setPlaceDay(state: TripState, placeId: string, dayId: string) {
  const place = state.zonePlaces.find((item) => item.id === placeId);
  if (place) place.suggestedDayId = dayId;
}

function ensureZoneOnDay(state: TripState, dayId: string, zoneId: string) {
  const day = state.days.find((item) => item.id === dayId);
  if (!day) return;
  day.zoneIds = Array.from(new Set([...(day.zoneIds ?? []), zoneId]));
}

function ensureRecommendedDay(state: TripState, zoneId: string, dayId: string) {
  const zone = state.zones.find((item) => item.id === zoneId);
  if (!zone) return;
  zone.recommendedDayIds = Array.from(new Set([...zone.recommendedDayIds, dayId]));
}

function setOrder(state: TripState, dayId: string, ids: string[]) {
  const rank = new Map(ids.map((id, index) => [id, index]));
  const active = state.activities
    .filter((activity) => activity.dayId === dayId && activity.included)
    .sort((a, b) => {
      const ra = rank.get(a.id);
      const rb = rank.get(b.id);
      if (ra != null && rb != null) return ra - rb;
      if (ra != null) return -1;
      if (rb != null) return 1;
      return a.order - b.order;
    });
  active.forEach((activity, index) => {
    activity.order = index;
  });
}

function setMeal(
  state: TripState,
  activityId: string,
  slot: Activity["mealSlot"],
  start?: string,
) {
  const activity = state.activities.find((item) => item.id === activityId);
  if (!activity) return;
  activity.mealSlot = slot;
  if (start) activity.start = start;
}

function updateDayCopy(
  state: TripState,
  dayId: string,
  patch: Partial<Pick<TripState["days"][number], "title" | "pace" | "summary" | "why" | "routeNote">>,
) {
  const day = state.days.find((item) => item.id === dayId);
  if (day) Object.assign(day, patch);
}

export function applyAuthorizedItineraryBalanceV1(input: TripState): {
  state: TripState;
  migrated: boolean;
} {
  if (input.notes?.[BALANCE_MIGRATION_KEY]) return { state: input, migrated: false };

  const state = structuredClone(input);

  // Osaka: 28 -> 8 cards, 29 -> 7, 30 -> 8, 31 -> 7.
  const osakaMoves: Array<[string, string, string?]> = [
    ["v7-28-rikuro", "2026-12-31"],
    ["zone-activity-zp-amerikamura", "2026-12-31", "zp-amerikamura"],
    ["zone-activity-zp-denden", "2026-12-30", "zp-denden"],
    ["zone-activity-zp-wanaka", "2026-12-30", "zp-wanaka"],
    ["zone-activity-zp-round1", "2026-12-30", "zp-round1"],
  ];
  osakaMoves.forEach(([activityId, dayId, placeId]) => {
    setActivityDay(state, activityId, dayId);
    if (placeId) setPlaceDay(state, placeId, dayId);
  });

  ensureZoneOnDay(state, "2026-12-30", "osaka-minami");
  ensureZoneOnDay(state, "2026-12-31", "osaka-minami");
  ensureRecommendedDay(state, "osaka-minami", "2026-12-30");
  ensureRecommendedDay(state, "osaka-minami", "2026-12-31");

  setOrder(state, "2026-12-28", [
    "zone-activity-zp-kuromon",
    "v7-28-pokecafe",
    "zone-activity-zp-shinsaibashi",
    "v7-28-chopsticks",
    "v7-28-matcha",
    "zone-activity-zp-dotonbori",
    "zone-activity-zp-tombori",
    "zone-activity-zp-ajinoya",
  ]);
  setOrder(state, "2026-12-29", [
    "zone-activity-zp-nakazakicho",
    "zone-activity-zp-pokemon-osaka",
    "zone-activity-zp-nintendo-osaka",
    "zone-activity-zp-yodobashi",
    "zone-activity-zp-grandgreen",
    "zone-activity-zp-timeout",
    "zone-activity-zp-umeda-sky",
  ]);
  setOrder(state, "2026-12-30", [
    "v7-30-kaiyukan",
    "zone-activity-zp-tempozan-market",
    "zone-activity-zp-ferris",
    "zone-activity-zp-santamaria",
    "zone-activity-zp-tempozan-park",
    "zone-activity-zp-denden",
    "zone-activity-zp-wanaka",
    "zone-activity-zp-round1",
  ]);
  setOrder(state, "2026-12-31", [
    "zone-activity-zp-publichall",
    "zone-activity-zp-nakanoshima31",
    "zone-activity-zp-kitahama-cafes",
    "zone-activity-zp-midosuji",
    "zone-activity-zp-amerikamura",
    "v7-28-rikuro",
    "v7-31-nye",
  ]);

  setMeal(state, "zone-activity-zp-kuromon", "breakfast", "09:00");
  setMeal(state, "v7-28-pokecafe", "lunch", "10:30");
  setMeal(state, "v7-28-matcha", "snack", "15:00");
  setMeal(state, "zone-activity-zp-ajinoya", "dinner", "18:30");
  setMeal(state, "zone-activity-zp-nakazakicho", "breakfast", "10:00");
  setMeal(state, "zone-activity-zp-timeout", "lunch", "13:30");
  setMeal(state, "zone-activity-zp-tempozan-market", "lunch", "13:00");
  setMeal(state, "zone-activity-zp-wanaka", "snack", "17:45");
  setMeal(state, "zone-activity-zp-kitahama-cafes", "lunch", "12:30");
  setMeal(state, "v7-28-rikuro", "snack", "16:30");
  setMeal(state, "v7-31-nye", "dinner", "19:00");

  updateDayCopy(state, "2026-12-28", {
    title: "Osaka Minami · mercado → Shinsaibashi → Dotonbori",
    pace: "Completo, pero caminable",
    summary: "Kuromon temprano, Pokémon Cafe y talleres en Shinsaibashi; la tarde baja hacia Dotonbori y termina con okonomiyaki.",
    why: "Se conservan las mejores anclas de Minami y se reparten cinco paradas flexibles entre el 30 y el 31.",
    routeNote: "Kuromon abre temprano; después el recorrido avanza hacia Shinsaibashi y vuelve bajando de forma continua hacia Dotonbori/Namba.",
  });
  updateDayCopy(state, "2026-12-30", {
    title: "Osaka Bay → Namba",
    pace: "Medio / variado",
    summary: "Kaiyukan y Tempozan durante el día; al salir, un único traslado a Namba para Den Den Town, takoyaki y Round1.",
    why: "Aprovecha un día que estaba muy liviano sin repetir viajes entre barrios: primero bahía, luego Minami y fin del día cerca del hotel.",
    routeNote: "Hotel → Osaka Bay → Tempozan → traslado único a Namba → Den Den Town → Wanaka → Round1.",
  });
  updateDayCopy(state, "2026-12-31", {
    title: "Nakanoshima → Kitahama → Midosuji → Minami",
    pace: "Relajado / festivo",
    summary: "Río y arquitectura por la mañana, café en Kitahama y descenso por Midosuji hasta Amerikamura, Rikuro y la cena de Nochevieja.",
    why: "El día gana contenido sin cruces innecesarios: se recorre Osaka de norte a sur antes de la cena.",
    routeNote: "Nakanoshima → Kitahama → Midosuji → Amerikamura → Rikuro → cena. Confirmar horarios especiales del 31 de diciembre.",
  });

  // Tokyo: move three selected Ginza cards from Jan 2 to the lighter Jan 8.
  const tokyoMoves: Array<[string, string]> = [
    ["jan8-suggestion-zp-ginza-itoya", "zp-ginza-itoya"],
    ["jan8-suggestion-zp-art-aquarium-ginza", "zp-art-aquarium-ginza"],
    ["jan8-suggestion-zp-ginza-sony-park", "zp-ginza-sony-park"],
  ];
  tokyoMoves.forEach(([activityId, placeId]) => {
    setActivityDay(state, activityId, "2027-01-08");
    setPlaceDay(state, placeId, "2027-01-08");
  });
  ensureZoneOnDay(state, "2027-01-08", "tokyo-ginza-central");
  ensureRecommendedDay(state, "tokyo-ginza-central", "2027-01-08");

  setOrder(state, "2027-01-02", [
    "jan8-suggestion-zp-tsukiji",
    "jan8-suggestion-zp-dsm",
    "jan8-suggestion-zp-ginza-six",
    "jan8-suggestion-zp-ginza-six-rooftop",
    "zone-activity-library-zone-lib-onitsuka-red",
    "zone-activity-library-zone-lib-onitsuka-yellow",
    "zone-activity-library-zone-lib-onitsuka-orange",
    "jan8-suggestion-zp-kagari",
    "zone-activity-library-zone-lib-ginza-kagari",
    "jan8-suggestion-zp-pillow",
    "jan8-suggestion-zp-nihonbashi",
  ]);
  setOrder(state, "2027-01-05", [
    "zone-activity-zp-nezu",
    "v7-5-perfume",
    "zone-activity-zp-omotesando",
    "zone-activity-zp-yello",
    "zone-activity-zp-matcha-tokyo",
    "zone-activity-library-zone-lib-candy",
    "zone-activity-library-zone-lib-capy",
    "zone-activity-library-zone-lib-atmospink",
    "zone-activity-library-zone-lib-samurai",
    "zone-activity-library-zone-lib-grounds2",
    "zone-activity-zp-grounds",
    "zone-activity-zp-miyashita",
    "zone-activity-library-zone-lib-grounds4",
    "zone-activity-zp-parco",
    "zone-activity-zp-hachiko",
    "zone-activity-zp-crossing",
  ]);
  setOrder(state, "2027-01-06", [
    "v7-6-jins",
    "zone-activity-zp-gu",
    "zone-activity-zp-uniqlo",
    "zone-activity-zp-isetan",
    "zone-activity-zp-cat",
    "zone-activity-zp-godzilla",
    "zone-activity-zp-donki",
    "v7-6-ring",
    "zone-activity-zp-tmg",
    "zone-activity-zp-nakano",
  ]);
  setOrder(state, "2027-01-08", [
    "v7-8-teamlab",
    "zone-activity-zp-divercity",
    "zone-activity-zp-odaiba-water",
    "jan8-suggestion-zp-ginza-sony-park",
    "v7-8-brother",
    "jan8-suggestion-zp-art-aquarium-ginza",
    "jan8-suggestion-zp-ginza-itoya",
  ]);

  setMeal(state, "jan8-suggestion-zp-tsukiji", "breakfast", "09:30");
  setMeal(state, "jan8-suggestion-zp-kagari", "lunch", "13:30");
  setMeal(state, "zone-activity-library-zone-lib-ginza-kagari", "lunch", "13:30");
  setMeal(state, "zone-activity-zp-matcha-tokyo", "snack", "15:30");

  updateDayCopy(state, "2027-01-02", {
    title: "Tsukiji → Ginza → Nihonbashi",
    summary: "Mercado por la mañana, bloque compacto de Ginza y cierre en Nihonbashi. Tres experiencias de Ginza pasan al 8 de enero para repartir la carga.",
    why: "El recorrido avanza desde Shimbashi/Tsukiji hacia Ginza y termina al norte en Nihonbashi, evitando ir y volver por el centro.",
    routeNote: "Shimbashi → Tsukiji → Ginza → Nihonbashi. Mantener las compras flexibles alrededor de las comidas.",
  });
  updateDayCopy(state, "2027-01-05", {
    title: "Aoyama → Omotesando / Harajuku → Shibuya",
    summary: "Experiencias y tiendas avanzando de este a oeste hasta terminar en Shibuya, sin regresar a Aoyama al final del día.",
    why: "La ruta agrupa Aoyama/Omotesando, luego Jingumae/Harajuku y finalmente Shibuya.",
    routeNote: "Nezu/Aoyama → Omotesando → Jingumae/Harajuku → Miyashita/PARCO → Hachiko y Crossing.",
  });
  updateDayCopy(state, "2027-01-06", {
    title: "Shinjuku → Nakano",
    summary: "Compras compactas en Shinjuku, taller de anillo como ancla y cierre desplazándose hacia el oeste hasta Nakano Broadway.",
    why: "Nakano queda al final para no hacer Shinjuku → Nakano → Shinjuku.",
    routeNote: "Shinjuku este/centro → taller de anillo → lado oeste / mirador → Nakano Broadway.",
  });
  updateDayCopy(state, "2027-01-08", {
    title: "Toyosu / Odaiba → Ginza / Kyobashi",
    pace: "Completo, con dos anclas",
    summary: "teamLab y Odaiba primero; después regreso al centro para Sony Park, Brother, Art Aquarium e Itoya.",
    why: "El día pasa de cuatro a siete paradas y aprovecha que Ginza/Kyobashi queda en el camino de vuelta hacia Shimbashi.",
    routeNote: "Shimbashi → Toyosu → Odaiba → Ginza → Kyobashi. Brother mantiene su hora como ancla; las demás paradas de Ginza son flexibles.",
  });

  // Label existing food cards once so future moves/additions keep their meal behavior.
  state.activities.forEach((activity) => {
    if (!activity.included) return;
    activity.mealSlot = activity.mealSlot ?? inferMealSlot(activity);
  });

  state.notes = state.notes ?? {};
  state.notes[BALANCE_MIGRATION_KEY] =
    "Aplicado una sola vez: balance Osaka/Tokyo, orden geográfico, franjas de comida y hotspots compartidos.";

  return { state, migrated: true };
}
