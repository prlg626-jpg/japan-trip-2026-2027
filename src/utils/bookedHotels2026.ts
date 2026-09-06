import type { Purchase, TripDay, TripState } from "../types";

const OSAKA_HOTEL_ID = "hotel-osaka";
const TOKYO_HOTEL_ID = "hotel-tokyo";
const OSAKA_HOTEL = "Hotel Monterey Le Frere Osaka";
const TOKYO_HOTEL = "Tokyu Stay Shimbashi";

function mapsDirections(from: string, to: string) {
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&travelmode=transit`;
}

function setDayRoute(
  day: TripDay | undefined,
  text: string,
  from: string,
  to: string,
  routeNote?: string,
) {
  if (!day) return;
  day.dayRoute = {
    city: day.city.includes("Tokyo") ? "Tokyo" : "Osaka",
    text,
    from,
    to,
    googleMapsUrl: mapsDirections(from, to),
  };
  if (routeNote) day.routeNote = routeNote;
}

function upsertHotelPurchase(state: TripState, purchase: Purchase) {
  const index = state.purchases.findIndex((item) => item.id === purchase.id);
  if (index >= 0) state.purchases[index] = purchase;
  else state.purchases.push(purchase);
}

/** Canonical hotel booking patch for the confirmed Osaka and Tokyo stays. */
export function applyBookedHotels2026(input: TripState): TripState {
  const state = structuredClone(input);
  const usdCop = state.settings.fx.USD;

  const osaka = state.hotels.find((hotel) => hotel.id === OSAKA_HOTEL_ID);
  if (osaka) {
    osaka.city = "Osaka";
    osaka.name = OSAKA_HOTEL;
    osaka.price = { amount: 940.52, currency: "USD", amountCOP: Math.round(940.52 * usdCop) };
    osaka.nights = 7;
    osaka.status = "Reservado - pago pendiente";
    osaka.reservation = "Confirmado";
    osaka.notes = "Reserva confirmada para 2 adultos. Queen Room, Non-Smoking, 21 m², 1 King bed. Sin desayuno. Total mostrado: US$940.52 incluidos impuestos y cargos. Pago diferido según la reserva.";
    osaka.address = "1-12-8 Sonezakishinchi, Kita-ku, Osaka 530-0002, Japan";
    osaka.paid = false;
    osaka.quotedNights = 7;
    osaka.plannedNights = 7;
    osaka.quoteCoverage = "full";
    osaka.quoteWarning = "";
    osaka.checkIn = "2026-12-25";
    osaka.checkOut = "2027-01-01";
    osaka.roomType = "Queen Room, Non-Smoking · 21 m² · 1 King bed";
    osaka.mealPlan = "Sin desayuno";
    osaka.cancellationDeadline = "2026-12-22 21:59 JST";
    osaka.archived = false;
  }

  const tokyo = state.hotels.find((hotel) => hotel.id === TOKYO_HOTEL_ID);
  if (tokyo) {
    tokyo.city = "Tokyo";
    tokyo.name = TOKYO_HOTEL;
    tokyo.price = { amount: 1057, currency: "USD", amountCOP: Math.round(1057 * usdCop) };
    tokyo.nights = 7;
    tokyo.status = "Reservado - pago pendiente";
    tokyo.reservation = "Confirmado";
    tokyo.notes = "Reserva confirmada para 2 adultos. Total informado: US$1,057. Se registra como reservado hasta confirmar el cargo efectivo.";
    tokyo.address = "4-23-1 Shimbashi, Minato-ku, Tokyo 105-0004, Japan";
    tokyo.lat = 35.66354;
    tokyo.lon = 139.75705;
    tokyo.paid = false;
    tokyo.quotedNights = 7;
    tokyo.plannedNights = 7;
    tokyo.quoteCoverage = "full";
    tokyo.quoteWarning = "";
    tokyo.checkIn = "2027-01-02";
    tokyo.checkOut = "2027-01-09";
    tokyo.archived = false;
  }

  state.booked[OSAKA_HOTEL_ID] = true;
  state.booked[TOKYO_HOTEL_ID] = true;

  upsertHotelPurchase(state, {
    id: "purchase-hotel-osaka-monterey",
    name: `${OSAKA_HOTEL} · 7 noches`,
    category: "Hoteles",
    activityId: null,
    city: "Osaka",
    provider: "Klook",
    originalAmount: 940.52,
    currency: "USD",
    amountCOP: Math.round(940.52 * usdCop),
    date: "25 dic – 1 ene",
    confirmationNumber: "",
    status: "Reservado",
    notes: "2 adultos · Queen Room Non-Smoking · 21 m² · 1 King bed · sin desayuno · total US$940.52 · pago diferido · cancelación gratuita hasta 22 dic 2026 21:59 JST.",
    link: osaka?.klookUrl || osaka?.link || "",
    receipt: { url: "", driveUrl: "", fileName: "", storagePath: "" },
  });

  upsertHotelPurchase(state, {
    id: "purchase-hotel-tokyo-tokyustay",
    name: `${TOKYO_HOTEL} · 7 noches`,
    category: "Hoteles",
    activityId: null,
    city: "Tokyo",
    provider: "Reserva hotel",
    originalAmount: 1057,
    currency: "USD",
    amountCOP: Math.round(1057 * usdCop),
    date: "2 ene – 9 ene",
    confirmationNumber: "",
    status: "Reservado",
    notes: "2 adultos · reserva confirmada · total informado US$1,057. Se mantiene como reservado no pagado hasta confirmar el cargo.",
    link: tokyo?.klookUrl || tokyo?.link || "",
    receipt: { url: "", driveUrl: "", fileName: "", storagePath: "" },
  });

  const hotelBudget = state.budget.categories.find((category) => category.id === "hoteles");
  if (hotelBudget) hotelBudget.name = "Hoteles";
  state.budget.hotelBudgets = state.budget.hotelBudgets.map((entry) => {
    if (entry.city === "Osaka") return { ...entry, nights: 7, budget: Math.round(940.52 * usdCop) };
    if (entry.city === "Tokyo") return { ...entry, nights: 7, budget: Math.round(1057 * usdCop) };
    return entry;
  });

  state.activities.forEach((activity) => {
    if (activity.dayId < "2026-12-25" || activity.dayId > "2027-01-01") return;
    activity.place = activity.place.replace(/Imperial Hotel Osaka/g, OSAKA_HOTEL);
    activity.description = activity.description.replace(/Imperial Hotel Osaka/g, OSAKA_HOTEL);
    activity.note = activity.note.replace(/Imperial Hotel Osaka/g, OSAKA_HOTEL);
    if (activity.googleMapsUrl.includes("Imperial%20Hotel%20Osaka")) {
      activity.googleMapsUrl = activity.googleMapsUrl.replace(/Imperial%20Hotel%20Osaka/g, encodeURIComponent(OSAKA_HOTEL));
    }
  });

  const d25 = state.days.find((day) => day.id === "2026-12-25");
  setDayRoute(d25, "Shin-Osaka -> JR Osaka -> Hotel Monterey Le Frere Osaka. Calcula aprox. 20–25 min totales; desde JR Osaka Station son unos 10 min a pie y Kitashinchi queda a 1 min del hotel.", "Shin-Osaka Station", OSAKA_HOTEL, "Llegada mucho más simple que con el Imperial: JR hasta Osaka Station y último tramo a pie; no dependemos de shuttle.");

  const d26 = state.days.find((day) => day.id === "2026-12-26");
  setDayRoute(d26, "Hotel Monterey Le Frere Osaka -> Osaka Castle / Okawa. Calcula aprox. 20–30 min según el punto elegido; sigue siendo un día sin reservas y de baja presión.", OSAKA_HOTEL, "Osaka Castle Park", "Ya no estamos al lado del río como en el Imperial. Mantener 1–2 opciones y decidir según energía.");

  const d27 = state.days.find((day) => day.id === "2026-12-27");
  setDayRoute(d27, "Hotel Monterey Le Frere Osaka -> Osaka Station -> Universal City. Calcula aprox. 30–35 min; Osaka Station funciona como nodo JR para llegar a USJ.", OSAKA_HOTEL, "Universal Studios Japan", "Salir con margen para la apertura del parque. La nueva base en Umeda mejora este traslado frente al Imperial.");

  const d28 = state.days.find((day) => day.id === "2026-12-28");
  setDayRoute(d28, "Hotel Monterey Le Frere Osaka -> Umeda/Nishi-Umeda -> Shinsaibashi. Aproximadamente 20–25 min hasta el núcleo de Shinsaibashi; después Dotonbori y Namba se hacen a pie.", OSAKA_HOTEL, "Pokemon Cafe Osaka Daimaru Shinsaibashi", "Bajar una sola vez a Minami y mantener el resto del día caminable: Shinsaibashi -> Dotonbori -> Namba.");

  const d29 = state.days.find((day) => day.id === "2026-12-29");
  setDayRoute(d29, "Hotel Monterey Le Frere Osaka -> Osaka Station / Umeda. La zona principal del día queda a unos 10 min a pie; Kitashinchi está prácticamente al lado del hotel.", OSAKA_HOTEL, "LUCUA Osaka", "Día especialmente cómodo desde el nuevo hotel: Umeda y Osaka Station quedan en el entorno inmediato.");

  const d30 = state.days.find((day) => day.id === "2026-12-30");
  setDayRoute(d30, "Hotel Monterey Le Frere Osaka -> Osaka Aquarium Kaiyukan / Tempozan. Calcula aprox. 35–45 min en metro; mantener toda la jornada concentrada en Osaka Bay.", OSAKA_HOTEL, "Osaka Aquarium Kaiyukan", "Un solo desplazamiento hacia la bahía y regreso al final; no combinar con otra zona lejana.");

  const d31 = state.days.find((day) => day.id === "2026-12-31");
  setDayRoute(d31, "Hotel Monterey Le Frere Osaka -> Nakanoshima / Kitahama -> Midosuji -> Shinsaibashi. Recorrido lineal norte-sur; el primer tramo es cercano y evita cruces innecesarios.", OSAKA_HOTEL, "Nakanoshima Park", "La nueva base encaja especialmente bien con el 31: empezar cerca de Nakanoshima y avanzar hacia el sur sin regresar sobre los pasos.");

  const d1 = state.days.find((day) => day.id === "2027-01-01");
  setDayRoute(d1, "Hotel Monterey Le Frere Osaka -> Osaka Station / Shin-Osaka -> Odawara -> Hakone. Reserva aprox. 20–25 min para alcanzar Shin-Osaka antes del Shinkansen.", OSAKA_HOTEL, "Shin-Osaka Station", "Salida de Osaka más sencilla desde Umeda. El tramo final en Hakone se ajustará cuando confirmemos el ryokan.");

  const d2 = state.days.find((day) => day.id === "2027-01-02");
  if (d2?.dayRoute) {
    d2.dayRoute.to = TOKYO_HOTEL;
    d2.dayRoute.googleMapsUrl = mapsDirections(d2.dayRoute.from || "Tokyo Station", TOKYO_HOTEL);
    d2.dayRoute.text = "Llegada desde Hakone a Tokyo y traslado a Tokyu Stay Shimbashi. Shimbashi Station queda a unos 3 min a pie del hotel.";
  }

  state.hotelRoutes[OSAKA_HOTEL_ID] = [
    { name: "Kitashinchi Station", km: "≈0.1 km", time: "1 min a pie" },
    { name: "JR Osaka Station / Umeda", km: "≈0.9 km", time: "10 min a pie" },
    { name: "Nakanoshima / Kitahama", km: "≈1.5–2 km", time: "15–20 min" },
    { name: "Shinsaibashi / Dotonbori", km: "≈3.5–4 km", time: "20–30 min" },
    { name: "Osaka Castle Park", km: "≈4 km", time: "20–30 min" },
    { name: "Shin-Osaka Station", km: "≈4.5 km", time: "20–25 min" },
    { name: "Universal Studios Japan", km: "≈9–10 km", time: "30–35 min" },
    { name: "Kaiyukan / Tempozan", km: "≈10–11 km", time: "35–45 min" },
  ];

  state.hotelRoutes[TOKYO_HOTEL_ID] = [
    { name: "Shimbashi Station", km: "≈0.3 km", time: "3 min a pie" },
    { name: "Ginza", km: "≈1 km", time: "10–15 min a pie" },
    { name: "Tokyo Station", km: "≈2.5 km", time: "10–15 min en tren" },
    { name: "teamLab Planets / Toyosu", km: "≈4 km", time: "20–25 min" },
    { name: "Yushima / Ueno", km: "≈5 km", time: "25–30 min" },
    { name: "Shibuya / Omotesando", km: "≈7 km", time: "25–30 min" },
    { name: "Shinjuku", km: "≈8 km", time: "25–30 min" },
    { name: "Tokyo DisneySea", km: "≈16 km", time: "40–50 min" },
  ];

  if (!state.decisions.includes(`${OSAKA_HOTEL} reservado 25 dic 2026–1 ene 2027.`)) state.decisions.push(`${OSAKA_HOTEL} reservado 25 dic 2026–1 ene 2027.`);
  if (!state.decisions.includes(`${TOKYO_HOTEL} reservado 2–9 ene 2027.`)) state.decisions.push(`${TOKYO_HOTEL} reservado 2–9 ene 2027.`);

  return state;
}
