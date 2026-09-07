import type { LibraryItem, TripState, Zone, ZonePlace } from "../types";

const OSAKA_HOTEL = "Hotel Monterey Le Frere Osaka";
const TOKYO_HOTEL = "Tokyu Stay Shimbashi";

const TOKYO_ZONE_DAYS: Record<string, string> = {
  "tokyo-ueno-asakusa": "2027-01-03",
  "tokyo-shibuya-aoyama": "2027-01-05",
  "tokyo-shinjuku-nakano": "2027-01-06",
  "tokyo-ebisu-daikanyama": "2027-01-07",
  "tokyo-toyosu": "2027-01-08",
  "tokyo-ginza-central": "2027-01-02",
  "tokyo-roppongi-akasaka": "2027-01-02",
  "tokyo-arrival-shimbashi-hibiya": "2027-01-01",
};

function mapsDirections(from: string, to: string) {
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&travelmode=transit`;
}

function mapsSearch(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function scrubLegacyHotelText(value: string) {
  return value
    .replace(/Imperial Hotel Osaka/gi, OSAKA_HOTEL)
    .replace(/Imperial Hotel/gi, OSAKA_HOTEL)
    .replace(/\bImperial\b/gi, OSAKA_HOTEL);
}

function appendZone(day: TripState["days"][number] | undefined, zoneId: string) {
  if (!day) return;
  day.zoneIds = Array.from(new Set([...(day.zoneIds ?? []), zoneId]));
}

function ensureZone(state: TripState, zone: Zone) {
  if (!state.zones.some((item) => item.id === zone.id)) state.zones.push(zone);
}

function ensurePlace(state: TripState, place: ZonePlace) {
  const existing = state.zonePlaces.find(
    (item) => item.id === place.id || (item.zoneId === place.zoneId && item.title.trim().toLowerCase() === place.title.trim().toLowerCase()),
  );
  if (!existing) state.zonePlaces.push(place);
}

function zoneForLibraryItem(item: LibraryItem): string | null {
  const text = `${item.title} ${item.place}`.toLowerCase();
  if (/ginza|nihonbashi|kyobashi|yurakucho/.test(text)) return "tokyo-ginza-central";
  if (/harajuku|jingumae|shibuya|omotesando|aoyama|miyashita/.test(text)) return "tokyo-shibuya-aoyama";
  if (/shinjuku|nakano/.test(text)) return "tokyo-shinjuku-nakano";
  if (/ueno|asakusa|akihabara|solamachi|skytree|okachimachi/.test(text)) return "tokyo-ueno-asakusa";
  if (/ebisu|daikanyama/.test(text)) return "tokyo-ebisu-daikanyama";
  if (/toyosu|odaiba/.test(text)) return "tokyo-toyosu";
  if (/roppongi|akasaka/.test(text)) return "tokyo-roppongi-akasaka";
  return null;
}

function libraryPlace(item: LibraryItem, zoneId: string, dayId: string, order: number): ZonePlace {
  return {
    id: `library-zone-${item.id}`,
    zoneId,
    title: item.title,
    description: item.note || "Opción guardada del viaje. Está aquí porque queda en esta misma zona y se puede añadir sin cruzar Tokyo innecesariamente.",
    category: item.kind === "food" ? "food" : item.kind === "shopping" ? "shopping" : item.category === "calzado" ? "shopping" : "experience",
    subCategory: item.category || "",
    priorityRank: item.priority ? "essential" : "recommended",
    lat: item.lat,
    lon: item.lon,
    address: item.place,
    nearestStation: "",
    estimatedDurationMinutes: null,
    priceScope: "unknown",
    priceOriginal: null,
    priceLabel: "Precio por verificar",
    reservationRequired: false,
    openingHours: "",
    holidayNote: dayId === "2027-01-02" ? "Año Nuevo: confirmar horario específico del 2 de enero antes de ir." : "",
    officialUrl: item.bookingUrl,
    googleMapsUrl: item.googleMapsUrl || mapsSearch(item.place || item.title),
    sourceIds: item.sourceIds,
    ratingContext: "",
    seasonalFit: "Invierno",
    selected: false,
    suggestedDayId: dayId,
    order,
  };
}

function distributeUnselectedTokyoOptions(state: TripState) {
  // Add two missing geographic buckets. These are suggestion containers only;
  // no selected activity is ever moved into them.
  ensureZone(state, {
    id: "tokyo-arrival-shimbashi-hibiya",
    city: "Tokyo",
    name: "Shimbashi / Hibiya · llegada suave",
    aliases: ["Shimbashi", "Hibiya", "Marunouchi"],
    description: "Opciones suaves cerca del hotel para la tarde/noche del 1 de enero, sin convertir el día de Shinkansen en una carrera.",
    center: { lat: 35.6705, lon: 139.7585 },
    hotelId: "hotel-tokyo",
    themeColor: "#FFEAF3",
    recommendedDayIds: ["2027-01-01"],
    tags: ["paseo", "comida", "llegada"],
  });
  ensureZone(state, {
    id: "tokyo-roppongi-akasaka",
    city: "Tokyo",
    name: "Roppongi / Akasaka",
    aliases: ["Roppongi", "Akasaka"],
    description: "Opciones centrales al oeste de Shimbashi que conviene agrupar entre sí en vez de mezclarlas con Harajuku o Ginza.",
    center: { lat: 35.667, lon: 139.735 },
    hotelId: "hotel-tokyo",
    themeColor: "#FFEAF3",
    recommendedDayIds: ["2027-01-02"],
    tags: ["compras", "experiencias", "paseo"],
  });

  const jan1 = state.days.find((day) => day.id === "2027-01-01");
  const jan2 = state.days.find((day) => day.id === "2027-01-02");
  appendZone(jan1, "tokyo-arrival-shimbashi-hibiya");
  appendZone(jan2, "tokyo-ginza-central");
  appendZone(jan2, "tokyo-roppongi-akasaka");

  // Jan 1: only gentle, location-safe suggestions. Nothing is preselected.
  ensurePlace(state, {
    id: "zp-jan1-hibiya-walk",
    zoneId: "tokyo-arrival-shimbashi-hibiya",
    title: "Hibiya → Marunouchi paseo nocturno",
    description: "Paseo urbano suave después de llegar de Osaka. Sirve para estirar las piernas y ver Tokyo iluminado sin depender de una reserva.",
    category: "explore",
    subCategory: "arrival-walk",
    priorityRank: "recommended",
    lat: 35.6736,
    lon: 139.7559,
    address: "Hibiya, Chiyoda City, Tokyo",
    nearestStation: "Hibiya",
    estimatedDurationMinutes: 75,
    priceScope: "free",
    priceOriginal: null,
    priceLabel: "Gratis",
    reservationRequired: false,
    openingHours: "Exterior / a tu ritmo",
    holidayNote: "El 1 de enero muchas tiendas cierran; esta opción está pensada como paseo exterior.",
    officialUrl: "",
    googleMapsUrl: mapsSearch("Hibiya Tokyo"),
    sourceIds: [],
    ratingContext: "",
    seasonalFit: "Noche de invierno",
    selected: false,
    suggestedDayId: "2027-01-01",
    order: 1,
  });
  ensurePlace(state, {
    id: "zp-jan1-shimbashi-dinner",
    zoneId: "tokyo-arrival-shimbashi-hibiya",
    title: "Cena tranquila por Shimbashi",
    description: "Dejar la primera noche abierta para escoger algo cerca del hotel según energía y qué esté abierto en Año Nuevo.",
    category: "food",
    subCategory: "arrival-dinner",
    priorityRank: "recommended",
    lat: 35.6663,
    lon: 139.7584,
    address: "Shimbashi, Minato City, Tokyo",
    nearestStation: "Shimbashi",
    estimatedDurationMinutes: 90,
    priceScope: "variable",
    priceOriginal: null,
    priceLabel: "Variable",
    reservationRequired: false,
    openingHours: "Por confirmar",
    holidayNote: "1 de enero: comprobar restaurantes abiertos ese mismo día.",
    officialUrl: "",
    googleMapsUrl: mapsSearch("Shimbashi restaurants Tokyo"),
    sourceIds: [],
    ratingContext: "",
    seasonalFit: "Año Nuevo",
    selected: false,
    suggestedDayId: "2027-01-01",
    order: 2,
  });

  // Jan 2 becomes the natural central-Tokyo/Ginza suggestion day. Tokyo's
  // January sales commonly begin around Jan 2, while many shops close Jan 1.
  ensurePlace(state, {
    id: "zp-ok-ginza-supermarket",
    zoneId: "tokyo-ginza-central",
    title: "OK Ginza · supermercado japonés",
    description: "Supermercado real de barrio/discount dentro de Marronnier Gate Ginza 2. Bueno para curiosear snacks, comida preparada, bebidas y productos cotidianos japoneses.",
    category: "market",
    subCategory: "supermarket",
    priorityRank: "recommended",
    lat: 35.6735,
    lon: 139.7645,
    address: "Marronnier Gate Ginza 2 B1–B2, 3-2-1 Ginza, Chuo City, Tokyo",
    nearestStation: "Ginza / Yurakucho",
    estimatedDurationMinutes: 45,
    priceScope: "free",
    priceOriginal: null,
    priceLabel: "Entrada gratis · compras opcionales",
    reservationRequired: false,
    openingHours: "Horario habitual 08:30–21:30",
    holidayNote: "Confirmar horario especial del 2 de enero de 2027.",
    officialUrl: "https://ok-corporation.jp/shop/ginnza.html",
    googleMapsUrl: mapsSearch("OK Ginza Marronnier Gate Ginza 2"),
    sourceIds: [],
    ratingContext: "",
    seasonalFit: "Todo el año",
    selected: false,
    suggestedDayId: "2027-01-02",
    order: 5,
  });

  // Move ONLY unselected activities to the day that matches their hotspot.
  // Selected/included activities are authoritative and remain exactly where the user put them.
  state.activities.forEach((activity) => {
    if (activity.included || !activity.zoneId) return;
    const targetDay = TOKYO_ZONE_DAYS[activity.zoneId];
    if (targetDay) activity.dayId = targetDay;
  });

  // Same rule for hotspot cards: only unselected cards are redistributed.
  state.zonePlaces.forEach((place) => {
    if (place.selected) return;
    const targetDay = TOKYO_ZONE_DAYS[place.zoneId];
    if (targetDay) place.suggestedDayId = targetDay;
  });

  // Surface the old Library options inside the relevant day/hotspot instead of
  // hiding them in a single long list. This does not select or activate them.
  const selectedTitles = new Set(
    state.activities.filter((activity) => activity.included).map((activity) => activity.title.trim().toLowerCase()),
  );
  let order = 50;
  state.library.forEach((item) => {
    if (item.status !== "fuera_del_viaje") return;
    if (selectedTitles.has(item.title.trim().toLowerCase())) return;
    const zoneId = zoneForLibraryItem(item);
    if (!zoneId) return;
    const dayId = TOKYO_ZONE_DAYS[zoneId];
    if (!dayId) return;
    item.suggestedDate = dayId;
    appendZone(state.days.find((day) => day.id === dayId), zoneId);
    ensurePlace(state, libraryPlace(item, zoneId, dayId, order++));
  });
}

/** Current canonical routing after cancelling Hakone and moving Tokyo check-in to Jan 1. */
export function applyCurrentItinerary2027(input: TripState): TripState {
  const state = structuredClone(input);

  state.trip.route = state.trip.route.filter((stop) => stop !== "Hakone");
  state.hotels = state.hotels.filter((hotel) => hotel.id !== "hotel-hakone");
  state.budget.hotelBudgets = state.budget.hotelBudgets.filter((entry) => entry.city !== "Hakone");
  state.ryokanCandidates = [];
  delete state.booked["hotel-hakone"];

  const tokyo = state.hotels.find((hotel) => hotel.id === "hotel-tokyo");
  if (tokyo) {
    tokyo.checkIn = "2027-01-01";
    tokyo.checkOut = "2027-01-09";
    tokyo.nights = 8;
    tokyo.plannedNights = 8;
    tokyo.quotedNights = 8;
    tokyo.notes = `${tokyo.notes.replace(/2–9 ene 2027/gi, "1–9 ene 2027")} Estadía extendida a 8 noches. El importe de la compra debe actualizarse cuando se confirme el nuevo total pagado.`;
  }

  const tokyoPurchase = state.purchases.find((purchase) => purchase.id === "purchase-hotel-tokyo-tokyustay");
  if (tokyoPurchase) {
    tokyoPurchase.name = `${TOKYO_HOTEL} · 8 noches`;
    tokyoPurchase.date = "1 ene – 9 ene";
    tokyoPurchase.notes = `${tokyoPurchase.notes.replace(/2–9 ene 2027/gi, "1–9 ene 2027")} Fecha extendida a 8 noches; conservar importe actual hasta registrar el nuevo total pagado.`;
  }

  const obsoleteIds = new Set([
    "d1-break", "d1-transfer", "d1-checkin", "d1-onsen", "d1-kaiseki", "d1-night",
    "d2-break", "d2-onsen", "d2-checkout", "d2-tokyo", "d2-hotel", "d2-dinner",
  ]);
  state.activities = state.activities.filter((activity) => !obsoleteIds.has(activity.id));
  state.reservations = state.reservations.filter((reservation) => !reservation.activityId || !obsoleteIds.has(reservation.activityId));
  state.purchases = state.purchases.filter((purchase) => !purchase.activityId || !obsoleteIds.has(purchase.activityId));

  state.activities.forEach((activity) => {
    if (activity.dayId < "2026-12-25" || activity.dayId > "2027-01-01") return;
    activity.place = scrubLegacyHotelText(activity.place || "");
    activity.description = scrubLegacyHotelText(activity.description || "");
    activity.note = scrubLegacyHotelText(activity.note || "");
    activity.googleMapsUrl = scrubLegacyHotelText(activity.googleMapsUrl || "")
      .replace(/Imperial%20Hotel%20Osaka/gi, encodeURIComponent(OSAKA_HOTEL));
  });

  const route = (
    dayId: string,
    text: string,
    from: string,
    to: string,
    note: string,
    city = "Osaka",
  ) => {
    const day = state.days.find((item) => item.id === dayId);
    if (!day) return;
    day.dayRoute = { city, text, from, to, googleMapsUrl: mapsDirections(from, to) };
    day.routeNote = note;
  };

  route(
    "2026-12-25",
    "Narita Airport → N'EX hasta Shinagawa → Tokaido Shinkansen Nozomi hasta Shin-Osaka → JR local hasta Osaka Station → 10 min aprox. a pie hasta Hotel Monterey Le Frere Osaka.",
    "Narita International Airport",
    OSAKA_HOTEL,
    "Reservar N'EX y Shinkansen. No reservar el tramo JR Shin-Osaka → Osaka ni la caminata final. Dejar margen amplio por inmigración/equipaje antes de fijar el Shinkansen.",
  );
  route("2026-12-26", `${OSAKA_HOTEL} → Osaka Castle Park. Ir hacia Kitashinchi/Osaka Station y conectar en JR/metro según la ruta del momento; aprox. 20–30 min.`, OSAKA_HOTEL, "Osaka Castle Park", "Transporte urbano: no se reserva. Usar IC card (ICOCA/Suica).");
  route("2026-12-27", `${OSAKA_HOTEL} → caminar aprox. 10 min a Osaka Station → JR Osaka Loop Line hacia Nishikujo → cambiar a JR Yumesaki Line hacia Sakurajima → Universal City. Si aparece servicio directo Osaka → Universal City, tomarlo sin cambiar en Nishikujo.`, OSAKA_HOTEL, "Universal City Station", "Este trayecto NO se reserva. Es tren urbano JR: entrar con ICOCA/Suica. Desde Osaka Station el tramo ferroviario suele rondar 15 min; sumar la caminata desde el hotel y margen del parque.");
  route("2026-12-28", `${OSAKA_HOTEL} → Nishi-Umeda/Umeda → Shinsaibashi. Una vez en Shinsaibashi, Pokémon Cafe, Dotonbori y Namba quedan en el mismo corredor caminable.`, OSAKA_HOTEL, "Pokemon Cafe Osaka Daimaru Shinsaibashi", "Metro/urbano: no se reserva. Bajar una sola vez a Minami y hacer el resto a pie.");
  route("2026-12-29", `${OSAKA_HOTEL} → Osaka Station / LUCUA. Aproximadamente 10 min a pie; Umeda, Pokémon Center Osaka y Nintendo OSAKA quedan en el entorno inmediato.`, OSAKA_HOTEL, "LUCUA Osaka", "Día prácticamente caminable desde el hotel. No hay tren que reservar.");
  route("2026-12-30", `${OSAKA_HOTEL} → Umeda/Nishi-Umeda → Hommachi/Bentencho → Osakako → Kaiyukan/Tempozan. Aproximadamente 35–45 min según conexión.`, OSAKA_HOTEL, "Osaka Aquarium Kaiyukan", "Metro urbano: no se reserva. Mantener el día concentrado en Osaka Bay.");
  route("2026-12-31", `${OSAKA_HOTEL} → Nakanoshima / Kitahama → avanzar hacia el sur por Midosuji → Shinsaibashi. Ruta lineal, sin volver al hotel entre zonas.`, OSAKA_HOTEL, "Nakanoshima Park", "Tramos cortos a pie/metro; no se reservan. Confirmar horarios especiales de Año Nuevo.");

  const jan1 = state.days.find((day) => day.id === "2027-01-01");
  if (jan1) {
    jan1.city = "Osaka → Tokyo";
    jan1.title = "Osaka → Tokyo · Shinkansen y llegada tranquila";
    jan1.pace = "Traslado + tarde suave";
    jan1.summary = "Salida de Osaka y viaje directo a Tokyo. Sin Hakone. Después de llegar a Shimbashi quedan opciones suaves cerca del hotel.";
    jan1.why = "El día sigue priorizando el traslado; cualquier actividad adicional es opcional y cercana al hotel.";
    jan1.hotelId = "hotel-tokyo";
  }
  route("2027-01-01", `${OSAKA_HOTEL} → Osaka Station → Shin-Osaka → Tokaido Shinkansen Nozomi hasta Shinagawa → JR local hasta Shimbashi → caminar aprox. 3 min a ${TOKYO_HOTEL}.`, OSAKA_HOTEL, TOKYO_HOTEL, "Reservar el Shinkansen Shin-Osaka → Shinagawa. No reservar Osaka → Shin-Osaka ni Shinagawa → Shimbashi: son trenes urbanos y se pagan con IC card.", "Tokyo");

  const jan2 = state.days.find((day) => day.id === "2027-01-02");
  if (jan2) {
    jan2.city = "Tokyo";
    jan2.title = "Tokyo · primer día completo";
    jan2.pace = "Flexible";
    jan2.summary = "Primer día completo en Tokyo. Las sugerencias centrales de Ginza/Nihonbashi/Kyobashi y otras opciones cercanas aparecen aquí para que ustedes decidan cuáles activar.";
    jan2.why = "El 2 de enero ya no es día de traslado. Además, las rebajas de Año Nuevo suelen empezar alrededor de esta fecha, así que el centro de Tokyo encaja especialmente bien.";
    jan2.hotelId = "hotel-tokyo";
  }

  distributeUnselectedTokyoOptions(state);

  state.notes["itinerary-change-2027-01-01"] =
    "Hakone eliminado. Tokyo pasa a 1–9 ene 2027. Las actividades seleccionadas por el usuario son autoritativas y no se mueven. Las sugerencias no seleccionadas se redistribuyen por hotspot: Ginza/Nihonbashi/Kyobashi al 2 ene; Ueno/Asakusa al 3; Shibuya/Harajuku/Omotesando al 5; Shinjuku/Nakano al 6; Ebisu/Daikanyama al 7; Toyosu/Odaiba al 8. El 1 ene solo recibe opciones suaves cerca de Shimbashi/Hibiya.";

  state.decisions = state.decisions.filter((item) => !/Hakone|ryokan 1–2 ene/i.test(item));
  if (!state.decisions.includes("Hakone eliminado: Tokyo queda del 1 al 9 de enero de 2027; traslado Osaka → Tokyo el 1 de enero en Shinkansen.")) {
    state.decisions.push("Hakone eliminado: Tokyo queda del 1 al 9 de enero de 2027; traslado Osaka → Tokyo el 1 de enero en Shinkansen.");
  }

  return state;
}
