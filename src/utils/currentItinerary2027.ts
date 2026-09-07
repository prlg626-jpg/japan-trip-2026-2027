import type { TripState } from "../types";

const OSAKA_HOTEL = "Hotel Monterey Le Frere Osaka";
const TOKYO_HOTEL = "Tokyu Stay Shimbashi";

function mapsDirections(from: string, to: string) {
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&travelmode=transit`;
}

function scrubLegacyHotelText(value: string) {
  return value
    .replace(/Imperial Hotel Osaka/gi, OSAKA_HOTEL)
    .replace(/Imperial Hotel/gi, OSAKA_HOTEL)
    .replace(/\bImperial\b/gi, OSAKA_HOTEL);
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

  // Remove all obsolete Hakone activities and references from Jan 1–2.
  const obsoleteIds = new Set([
    "d1-break", "d1-transfer", "d1-checkin", "d1-onsen", "d1-kaiseki", "d1-night",
    "d2-break", "d2-onsen", "d2-checkout", "d2-tokyo", "d2-hotel", "d2-dinner",
  ]);
  state.activities = state.activities.filter((activity) => !obsoleteIds.has(activity.id));
  state.reservations = state.reservations.filter((reservation) => !reservation.activityId || !obsoleteIds.has(reservation.activityId));
  state.purchases = state.purchases.filter((purchase) => !purchase.activityId || !obsoleteIds.has(purchase.activityId));

  // Scrub Imperial from every activity text in Osaka so no legacy hotel survives in "Cómo llegar" or notes.
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

  route(
    "2026-12-26",
    `${OSAKA_HOTEL} → Osaka Castle Park. Ir hacia Kitashinchi/Osaka Station y conectar en JR/metro según la ruta del momento; aprox. 20–30 min.`,
    OSAKA_HOTEL,
    "Osaka Castle Park",
    "Transporte urbano: no se reserva. Usar IC card (ICOCA/Suica).",
  );

  route(
    "2026-12-27",
    `${OSAKA_HOTEL} → caminar aprox. 10 min a Osaka Station → JR Osaka Loop Line hacia Nishikujo → cambiar a JR Yumesaki Line hacia Sakurajima → Universal City. Si aparece servicio directo Osaka → Universal City, tomarlo sin cambiar en Nishikujo.`,
    OSAKA_HOTEL,
    "Universal City Station",
    "Este trayecto NO se reserva. Es tren urbano JR: entrar con ICOCA/Suica. Desde Osaka Station el tramo ferroviario suele rondar 15 min; sumar la caminata desde el hotel y margen del parque.",
  );

  route(
    "2026-12-28",
    `${OSAKA_HOTEL} → Nishi-Umeda/Umeda → Shinsaibashi. Una vez en Shinsaibashi, Pokémon Cafe, Dotonbori y Namba quedan en el mismo corredor caminable.`,
    OSAKA_HOTEL,
    "Pokemon Cafe Osaka Daimaru Shinsaibashi",
    "Metro/urbano: no se reserva. Bajar una sola vez a Minami y hacer el resto a pie.",
  );

  route(
    "2026-12-29",
    `${OSAKA_HOTEL} → Osaka Station / LUCUA. Aproximadamente 10 min a pie; Umeda, Pokémon Center Osaka y Nintendo OSAKA quedan en el entorno inmediato.`,
    OSAKA_HOTEL,
    "LUCUA Osaka",
    "Día prácticamente caminable desde el hotel. No hay tren que reservar.",
  );

  route(
    "2026-12-30",
    `${OSAKA_HOTEL} → Umeda/Nishi-Umeda → Hommachi/Bentencho → Osakako → Kaiyukan/Tempozan. Aproximadamente 35–45 min según conexión.`,
    OSAKA_HOTEL,
    "Osaka Aquarium Kaiyukan",
    "Metro urbano: no se reserva. Mantener el día concentrado en Osaka Bay.",
  );

  route(
    "2026-12-31",
    `${OSAKA_HOTEL} → Nakanoshima / Kitahama → avanzar hacia el sur por Midosuji → Shinsaibashi. Ruta lineal, sin volver al hotel entre zonas.`,
    OSAKA_HOTEL,
    "Nakanoshima Park",
    "Tramos cortos a pie/metro; no se reservan. Confirmar horarios especiales de Año Nuevo.",
  );

  const jan1 = state.days.find((day) => day.id === "2027-01-01");
  if (jan1) {
    jan1.city = "Osaka → Tokyo";
    jan1.title = "Osaka → Tokyo · Shinkansen y llegada tranquila";
    jan1.pace = "Traslado";
    jan1.summary = "Salida de Osaka y viaje directo a Tokyo. Sin Hakone. Llegada a Shimbashi y tarde/noche suave.";
    jan1.why = "Eliminamos Hakone y usamos el 1 de enero para movernos directamente a la base definitiva de Tokyo.";
    jan1.hotelId = "hotel-tokyo";
    jan1.activityIds = [];
    jan1.zoneIds = [];
  }
  route(
    "2027-01-01",
    `${OSAKA_HOTEL} → Osaka Station → Shin-Osaka → Tokaido Shinkansen Nozomi hasta Shinagawa → JR local hasta Shimbashi → caminar aprox. 3 min a ${TOKYO_HOTEL}.`,
    OSAKA_HOTEL,
    TOKYO_HOTEL,
    "Reservar el Shinkansen Shin-Osaka → Shinagawa. No reservar Osaka → Shin-Osaka ni Shinagawa → Shimbashi: son trenes urbanos y se pagan con IC card.",
    "Tokyo",
  );

  const jan2 = state.days.find((day) => day.id === "2027-01-02");
  if (jan2) {
    jan2.city = "Tokyo";
    jan2.title = "Tokyo · día abierto por rearmar";
    jan2.pace = "Relajado";
    jan2.summary = "Ya amanecemos en Tokyo. Se eliminó por completo la antigua mañana de ryokan/Hakone.";
    jan2.why = "El día queda libre para redistribuir actividades de Tokyo cuando cerremos la nueva versión del itinerario.";
    jan2.routeNote = "Sin traslado interurbano. Base: Tokyu Stay Shimbashi.";
    jan2.hotelId = "hotel-tokyo";
    jan2.dayRoute = null;
    jan2.activityIds = [];
    jan2.zoneIds = [];
  }

  state.notes["itinerary-change-2027-01-01"] =
    "Hakone eliminado. Tokyo pasa a 1–9 ene 2027 (8 noches). El 25 dic la ruta recomendada desde Narita a Osaka es N'EX NRT → Shinagawa + Nozomi Shinagawa → Shin-Osaka + JR local → Osaka Station + caminata al Hotel Monterey Le Frere Osaka. El 1 ene: Hotel Monterey → Shin-Osaka → Nozomi a Shinagawa → JR a Shimbashi → Tokyu Stay Shimbashi.";

  state.decisions = state.decisions.filter((item) => !/Hakone|ryokan 1–2 ene/i.test(item));
  state.decisions.push("Hakone eliminado: Tokyo queda del 1 al 9 de enero de 2027; traslado Osaka → Tokyo el 1 de enero en Shinkansen.");

  return state;
}
