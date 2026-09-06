import type { TripState } from "../types";

const DAY_ID = "2027-01-08";
const ZONE_ID = "tokyo-ginza-central";
const JPY_COP = 19.3465;

function addGinzaPlaceIfMissing(state: TripState, place: TripState["zonePlaces"][number]) {
  if (!state.zonePlaces.some((item) => item.id === place.id)) state.zonePlaces.push(place);
}

export function enrichTokyoJan8(input: TripState): TripState {
  const state = structuredClone(input);

  const day = state.days.find((item) => item.id === DAY_ID);
  if (day) {
    day.title = "Toyosu → Ginza / Kyobashi";
    day.pace = "Dos anclas + Ginza flexible";
    day.summary = "teamLab y Brother son las anclas. Entre ambos, Ginza queda como bloque flexible de diseño, arte, compras, comida y paseo urbano.";
    day.why = "Después de Toyosu el recorrido vuelve hacia el corredor Ginza–Kyobashi, donde Brother cierra el día. Las sugerencias intermedias quedan juntas para evitar cruces innecesarios de Tokyo.";
    day.routeNote = "Toyosu → Ginza → Kyobashi. Las actividades de Ginza son sugeridas y flexibles: elijan según energía, horarios y reservas. Brother permanece como ancla de la tarde.";
    day.dayRoute = {
      city: "Tokyo",
      text: "Shimbashi → teamLab Planets en Toyosu. Después regresar al corredor Ginza–Kyobashi y avanzar a pie hasta Brother JOYFACTORY; así las paradas intermedias quedan en una sola dirección.",
      from: "Tokyu Stay Shimbashi",
      to: "teamLab Planets TOKYO",
      googleMapsUrl: "https://www.google.com/maps/dir/?api=1&origin=Tokyu%20Stay%20Shimbashi&destination=teamLab%20Planets%20TOKYO&travelmode=transit",
    };
  }

  const brother = state.activities.find((activity) => activity.id === "v7-8-brother");
  if (brother) {
    brother.priceScope = "per_person";
    brother.priceOriginal = { currency: "JPY", unit: 13750, quantity: 1 };
    brother.totalForTwoCOP = Math.round(13750 * 2 * JPY_COP);
    brother.estimatedCostCOP = Math.round(13750 * 2 * JPY_COP);
    brother.priceLabel = `¥13.750 por persona · ¥27.500 para los dos · ≈ ${new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Math.round(13750 * 2 * JPY_COP))}`;
    brother.priceVerifiedAt = "2026-09-06";
    brother.priceSourceUrl = "https://web.global.brother/joyfactory/pdf/price/Spanish_Brother-JOYFACTORY-Pricelist.pdf";
    brother.costItemId = "d8-brother";
    brother.description = "BROTHER JOYFACTORY TOKYO en Kyobashi. Para hacer KARAOKE RECORD se requiere el paquete de entrada + SAMURAI LEGEND de ¥8.800 por persona y luego KARAOKE RECORD por ¥4.950 adicionales. Total actual: ¥13.750 por persona / ¥27.500 para los dos.";
    brother.note = "Precio oficial vigente desde el 15 de abril de 2026; Brother advierte que productos y precios pueden cambiar. Confirmar disponibilidad del 8 de enero al reservar.";
    brother.bookingUrl = "https://web.global.brother/joyfactory/index.html";
  }

  addGinzaPlaceIfMissing(state, {
    id: "zp-ginza-itoya",
    zoneId: ZONE_ID,
    title: "Ginza Itoya",
    description: "Flagship de papelería y diseño de varios pisos, con instrumentos de escritura, papel, objetos creativos y servicios de personalización. Está entre Ginza y Kyobashi, así que encaja naturalmente antes de Brother.",
    category: "shopping",
    subCategory: "design",
    priorityRank: "essential",
    lat: 35.6737,
    lon: 139.7685,
    address: "2-7-15 Ginza, Chuo-ku, Tokyo",
    nearestStation: "Ginza-itchome",
    estimatedDurationMinutes: 75,
    priceScope: "free",
    priceOriginal: null,
    priceLabel: "Entrada gratis · compras opcionales",
    reservationRequired: false,
    openingHours: "10:00–20:00; domingo/festivo 10:00–19:00",
    holidayNote: "Reconfirmar horario específico del 8 ene 2027.",
    officialUrl: "https://www.ito-ya.co.jp/ext/lang/en/information.html",
    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Ginza+Itoya",
    sourceIds: [],
    ratingContext: "",
    seasonalFit: "Todo el año",
    selected: false,
    suggestedDayId: DAY_ID,
    order: 20,
  });

  addGinzaPlaceIfMissing(state, {
    id: "zp-art-aquarium-ginza",
    zoneId: ZONE_ID,
    title: "Art Aquarium Museum GINZA",
    description: "Instalación inmersiva en Ginza Mitsukoshi que combina acuarios de goldfish, iluminación, arte y escenografía. Es una opción visual de 60–90 min sin salir de Ginza.",
    category: "museum",
    subCategory: "immersive",
    priorityRank: "recommended",
    lat: 35.6717,
    lon: 139.765,
    address: "Ginza Mitsukoshi New Building 9F",
    nearestStation: "Ginza",
    estimatedDurationMinutes: 90,
    priceScope: "per_person",
    priceOriginal: { currency: "JPY", unit: 2500, quantity: 1 },
    priceLabel: "¥2.500 por persona web · ¥5.000 para los dos",
    reservationRequired: true,
    openingHours: "10:00–19:00 · última entrada 18:00",
    holidayNote: "Horario y disponibilidad de enero 2027 deben reconfirmarse.",
    officialUrl: "https://artaquarium.jp/time_price/",
    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Art+Aquarium+Museum+GINZA",
    sourceIds: [],
    ratingContext: "",
    seasonalFit: "Todo el año",
    selected: false,
    suggestedDayId: DAY_ID,
    order: 21,
  });

  addGinzaPlaceIfMissing(state, {
    id: "zp-ginza-sony-park",
    zoneId: ZONE_ID,
    title: "Ginza Sony Park",
    description: "Espacio urbano de Sony con exposiciones y actividades temporales repartidas por varios pisos y rooftop. Conviene revisar qué programa esté activo específicamente el 8 de enero.",
    category: "experience",
    subCategory: "design-tech",
    priorityRank: "recommended",
    lat: 35.6724,
    lon: 139.7618,
    address: "5-3-1 Ginza, Chuo-ku, Tokyo",
    nearestStation: "Ginza",
    estimatedDurationMinutes: 75,
    priceScope: "variable",
    priceOriginal: null,
    priceLabel: "Acceso/parque variable según actividad",
    reservationRequired: false,
    openingHours: "11:00–19:00 normalmente",
    holidayNote: "Cierra en Año Nuevo y por mantenimiento; verificar que haya reabierto para el 8 ene 2027 y revisar la exposición vigente.",
    officialUrl: "https://www.ginzasonypark.com/e/visit/index.html",
    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Ginza+Sony+Park",
    sourceIds: [],
    ratingContext: "",
    seasonalFit: "Todo el año",
    selected: false,
    suggestedDayId: DAY_ID,
    order: 22,
  });

  addGinzaPlaceIfMissing(state, {
    id: "zp-ginza-six-rooftop",
    zoneId: ZONE_ID,
    title: "GINZA SIX rooftop garden",
    description: "Jardín en la azotea de GINZA SIX. Sirve como pausa corta y gratuita entre compras; se puede combinar con Tsutaya Books dentro del mismo edificio.",
    category: "explore",
    subCategory: "rooftop",
    priorityRank: "recommended",
    lat: 35.6697,
    lon: 139.764,
    address: "GINZA SIX, 6-10-1 Ginza",
    nearestStation: "Ginza",
    estimatedDurationMinutes: 35,
    priceScope: "free",
    priceOriginal: null,
    priceLabel: "Gratis",
    reservationRequired: false,
    openingHours: "Rooftop 7:00–23:00 normalmente",
    holidayNote: "Puede cerrar por mal tiempo o eventos; reconfirmar horario de enero.",
    officialUrl: "https://ginza6.tokyo/hours/",
    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=GINZA+SIX+Garden",
    sourceIds: [],
    ratingContext: "",
    seasonalFit: "Todo el año",
    selected: false,
    suggestedDayId: DAY_ID,
    order: 23,
  });

  const jan8GinzaPlaces = state.zonePlaces
    .filter((place) => place.zoneId === ZONE_ID && place.suggestedDayId === DAY_ID)
    .sort((a, b) => a.order - b.order);

  jan8GinzaPlaces.forEach((place, index) => {
    const activityId = `jan8-suggestion-${place.id}`;
    if (state.activities.some((activity) => activity.id === activityId || activity.title.toLowerCase() === place.title.toLowerCase())) return;
    state.activities.push({
      id: activityId,
      dayId: DAY_ID,
      order: 20 + index,
      start: "",
      end: "",
      durationMinutes: place.estimatedDurationMinutes,
      title: place.title,
      place: place.address || place.title,
      kind: place.category,
      lat: place.lat,
      lon: place.lon,
      bookingUrl: place.reservationRequired ? place.officialUrl : "",
      googleMapsUrl: place.googleMapsUrl,
      legacyStatus: "Sugerida",
      status: "idea",
      note: place.holidayNote || "Actividad flexible dentro del hotspot Ginza / Nihonbashi / Kyobashi.",
      priority: place.priorityRank === "essential",
      included: place.selected,
      flexible: true,
      fixed: false,
      sourceIds: place.sourceIds,
      costItemId: null,
      estimatedCostCOP: place.priceOriginal?.unit
        ? Math.round(place.priceOriginal.unit * (place.priceScope === "per_person" ? 2 : (place.priceOriginal.quantity || 1)) * (place.priceOriginal.currency === "JPY" ? JPY_COP : 1))
        : 0,
      actualPaidCOP: 0,
      description: place.description,
      zoneId: place.zoneId,
      displayMode: "flex-list",
      category: place.category,
      subCategory: place.subCategory,
      tags: [],
      priorityRank: place.priorityRank,
      priceScope: place.priceScope,
      priceLabel: place.priceLabel,
      priceOriginal: place.priceOriginal,
      totalForTwoCOP: null,
      priceVerifiedAt: place.id === "zp-art-aquarium-ginza" ? "2026-09-06" : "",
      priceSourceUrl: place.officialUrl,
      priceDynamic: place.priceScope === "variable",
      estimatedDurationMinutes: place.estimatedDurationMinutes,
      recommendedVisitMinutes: place.estimatedDurationMinutes,
      address: place.address || place.title,
      nearestStation: place.nearestStation,
      openingHours: place.openingHours,
      holidayNote: place.holidayNote,
      reservationRequired: place.reservationRequired,
      bookingLabel: place.reservationRequired ? "Ver / reservar" : "",
      mustKeep: false,
      routeStrategy: "flexible",
    } as TripState["activities"][number]);
  });

  return state;
}
