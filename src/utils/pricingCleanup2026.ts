import type { TripState } from "../types";

const CLEANUP_KEY = "remove-placeholder-nye-dinner-2026-09-27-v1";
const VERIFIED_AT = "2026-09-27";

function updateActivity(
  state: TripState,
  id: string,
  patch: Partial<TripState["activities"][number]>,
) {
  const activity = state.activities.find((item) => item.id === id);
  if (activity) Object.assign(activity, patch);
}

function updateCost(
  state: TripState,
  id: string,
  patch: Partial<TripState["costs"][number]>,
) {
  const cost = state.costs.find((item) => item.id === id);
  if (cost) Object.assign(cost, patch);
}

export function applyCurrentActivityPricing(input: TripState): TripState {
  const state = structuredClone(input);

  updateActivity(state, "d25-nex", {
    priceScope: "per_person",
    priceOriginal: { currency: "JPY", unit: 3330, quantity: 1 },
    priceLabel: "¥3.330 por persona · Narita Airport ↔ Shinagawa",
    priceVerifiedAt: VERIFIED_AT,
    priceSourceUrl: "https://www.jreast.co.jp/en/multi/nex/tickets/",
    priceDynamic: false,
  });

  updateActivity(state, "d25-shink", {
    priceScope: "per_person",
    priceOriginal: { currency: "JPY", unit: 14920, quantity: 1 },
    priceLabel:
      "≈ ¥14.920 por persona · Nozomi reservado, estimado de temporada alta; tarifa regular SmartEX ¥14.520",
    priceVerifiedAt: VERIFIED_AT,
    priceSourceUrl: "https://smart-ex.jp/en/product/plan/service/",
    priceDynamic: true,
  });

  updateActivity(state, "d27-usj", {
    priceScope: "per_person",
    priceLabel:
      "US$197 por persona · paquete registrado en el viaje; USJ usa precio dinámico por fecha",
    priceDynamic: true,
    priceVerifiedAt: VERIFIED_AT,
    priceSourceUrl: "https://www.usj.co.jp/web/en/us/tickets",
  });

  updateActivity(state, "d3-church", {
    priceScope: "free",
    priceOriginal: null,
    priceLabel: "Sin costo",
    priceDynamic: false,
  });

  updateActivity(state, "d4-disney", {
    priceScope: "per_person",
    priceOriginal: { currency: "JPY", unit: 10900, quantity: 1 },
    priceLabel:
      "≈ ¥10.900 por persona presupuestado · el precio exacto del 4 ene 2027 aún debe confirmarse",
    priceVerifiedAt: VERIFIED_AT,
    priceSourceUrl: "https://www.tokyodisneyresort.jp/en/tds/ticket/index/",
    priceDynamic: true,
  });

  updateActivity(state, "d7-jeans", {
    title: "Daruma Jeans · Denim Jeans Making Workshop",
    place: "Daruma Jeans Harajuku",
    address: "Harajuku TW Building 4F, 1-14-24 Jingumae, Shibuya, Tokyo",
    start: "11:00",
    end: "12:00",
    durationMinutes: 60,
    estimatedDurationMinutes: 60,
    recommendedVisitMinutes: 60,
    bookingUrl:
      "https://www.klook.com/en-US/activity/194175-tokyo-denim-jeans-making-workshop/",
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=Daruma+Jeans+Harajuku",
    description:
      "Taller práctico en Harajuku con denim Okayama. Eligen corte y talla y personalizan con parches, botones y remaches; el bordado es una personalización adicional. Sin bordado, el retiro puede ser el mismo día; con bordado, Klook indica retiro 2 días después.",
    note:
      "Reserva elegida: 7 ene 2027 · 11:00 · 2 personas. Personalización con parches, botones y remaches; bordado opcional con costo adicional.",
    priceScope: "for_two",
    priceOriginal: { currency: "COP", unit: 832431, quantity: 1 },
    estimatedCostCOP: 832431,
    totalForTwoCOP: 832431,
    priceLabel:
      "$832.431 COP para los dos · precio observado en Klook para 7 ene 2027 11:00 (US$248,70, 15% off)",
    priceVerifiedAt: VERIFIED_AT,
    priceSourceUrl:
      "https://www.klook.com/en-US/activity/194175-tokyo-denim-jeans-making-workshop/",
    priceDynamic: true,
    reservationRequired: true,
    bookingLabel: "Reservar en Klook",
  });

  updateActivity(state, "d7-spa", {
    priceScope: "per_person",
    priceOriginal: { currency: "JPY", unit: 24750, quantity: 1 },
    priceLabel: "¥24.750 por persona · Premium Head Spa 90 min",
    priceVerifiedAt: VERIFIED_AT,
    priceSourceUrl: "https://omotesando.spa-kuu.com/en/menu/",
    priceDynamic: false,
  });

  updateActivity(state, "d9-nex", {
    priceScope: "per_person",
    priceOriginal: { currency: "JPY", unit: 3140, quantity: 1 },
    priceLabel: "¥3.140 por persona · Tokyo ↔ Narita Airport",
    priceVerifiedAt: VERIFIED_AT,
    priceSourceUrl: "https://www.jreast.co.jp/en/multi/nex/tickets/",
    priceDynamic: false,
  });

  updateActivity(state, "v7-28-pokecafe", {
    priceScope: "per_person",
    priceOriginal: { currency: "JPY", unit: 2530, quantity: 1 },
    priceLabel:
      "Reserva sin costo · platos principales aprox. ¥2.090–¥2.530 por persona; presupuesto usa ¥2.530",
    priceVerifiedAt: VERIFIED_AT,
    priceSourceUrl: "https://www.pokemon-cafe.jp/en/cafe/",
    priceDynamic: true,
  });

  updateActivity(state, "v7-28-chopsticks", {
    bookingUrl:
      "https://www.klook.com/en-US/activity/203646-osaka-chopstick-making-workshop-with-local-instructor/",
    priceScope: "per_person",
    priceOriginal: { currency: "USD", unit: 14.85, quantity: 1 },
    priceLabel: "US$14,85 por persona observado en Klook · precio dinámico",
    priceVerifiedAt: VERIFIED_AT,
    priceSourceUrl:
      "https://www.klook.com/en-US/activity/203646-osaka-chopstick-making-workshop-with-local-instructor/",
    priceDynamic: true,
  });

  updateActivity(state, "v7-28-matcha", {
    bookingUrl:
      "https://www.klook.com/en-US/activity/95687-join-tea-ceremony-experience-osaka/",
    priceScope: "per_person",
    priceOriginal: { currency: "JPY", unit: 4200, quantity: 1 },
    priceLabel: "¥4.200 por persona · ceremonia del té / preparación de matcha",
    priceVerifiedAt: VERIFIED_AT,
    priceSourceUrl:
      "https://www.klook.com/en-US/activity/95687-join-tea-ceremony-experience-osaka/",
    priceDynamic: true,
  });

  updateActivity(state, "v7-30-kaiyukan", {
    priceScope: "per_person",
    priceOriginal: { currency: "JPY", unit: 2700, quantity: 1 },
    priceLabel:
      "Desde ¥2.700 por persona · tarifa dinámica; puede llegar aprox. a ¥3.500 según fecha",
    priceVerifiedAt: VERIFIED_AT,
    priceSourceUrl: "https://www.kaiyukan.com/info/ticket/kaiyukan/",
    priceDynamic: true,
  });

  updateActivity(state, "v7-3-kintsugi", {
    priceScope: "per_person",
    priceOriginal: { currency: "USD", unit: 23.79, quantity: 1 },
    priceLabel:
      "US$23,79 por persona observado en Klook · precio dinámico/promocional",
    priceVerifiedAt: VERIFIED_AT,
    priceSourceUrl:
      "https://www.klook.com/activity/186225-tokyo-kintsugi-making-experience/",
    priceDynamic: true,
  });

  updateActivity(state, "v7-6-ring", {
    priceScope: "per_person",
    priceOriginal: { currency: "USD", unit: 11.39, quantity: 1 },
    priceLabel:
      "US$11,39 por persona en promoción observada · precio regular mostrado US$22,75",
    priceVerifiedAt: VERIFIED_AT,
    priceSourceUrl:
      "https://www.klook.com/en-US/activity/222801-tokyo-vintage-coin-ring-making-workshop-in-shinjuku/",
    priceDynamic: true,
  });

  updateActivity(state, "v7-8-brother", {
    bookingUrl: "https://web.global.brother/joyfactory/index.html",
    priceScope: "per_person",
    priceOriginal: { currency: "JPY", unit: 13750, quantity: 1 },
    priceLabel:
      "¥13.750 por persona · entrada + SAMURAI LEGEND + KARAOKE RECORD",
    priceVerifiedAt: VERIFIED_AT,
    priceSourceUrl:
      "https://web.global.brother/joyfactory/pdf/price/Spanish_Brother-JOYFACTORY-Pricelist.pdf",
    priceDynamic: false,
  });

  updateCost(state, "d26-chopsticks", {
    original: { currency: "USD", unit: 14.85, quantity: 2 },
    note:
      "Klook muestra US$14,85 por persona al 27 sep 2026. Precio dinámico; confirmar checkout para el 28 dic.",
    link:
      "https://www.klook.com/en-US/activity/203646-osaka-chopstick-making-workshop-with-local-instructor/",
  });

  updateCost(state, "d26-matcha", {
    original: { currency: "JPY", unit: 4200, quantity: 2 },
    note:
      "Klook muestra ¥4.200 por persona para la experiencia de ceremonia del té/matcha en Dotonbori.",
    link:
      "https://www.klook.com/en-US/activity/95687-join-tea-ceremony-experience-osaka/",
  });

  updateCost(state, "d7-jeans", {
    title: "Daruma Jeans Harajuku · Denim Jeans Making Workshop",
    original: { currency: "COP", unit: 832431, quantity: 1 },
    estimateCOP: 832431,
    reservationStatus: "DISPONIBLE AHORA",
    opens: "Ya disponible para 7 ene 2027 · 11:00",
    note:
      "Klook muestra US$248,70 para 2 personas el 7 ene 2027 a las 11:00 (15% off). Convertido a $832.431 COP con la tasa consultada el 27 sep 2026. El precio es dinámico y puede cambiar antes del pago.",
    link:
      "https://www.klook.com/en-US/activity/194175-tokyo-denim-jeans-making-workshop/",
  });

  const jeansReservation = state.reservations.find(
    (reservation) => reservation.activityId === "d7-jeans",
  );
  if (jeansReservation) {
    Object.assign(jeansReservation, {
      name: "Daruma Jeans · Denim Jeans Making Workshop",
      travelDate: "2027-01-07",
      currentStatus: "DISPONIBLE AHORA",
      opens: "7 ene 2027 · 11:00 seleccionado",
      estimatedPriceCOP: 832431,
      link:
        "https://www.klook.com/en-US/activity/194175-tokyo-denim-jeans-making-workshop/",
      provider: "Klook · Daruma Jeans",
      reminderNotes:
        "2 personas · US$248,70 en el carrito (15% off). Sin bordado: retiro el mismo día entre 18:00–19:00; con bordado: retiro 2 días después.",
    });
  }

  updateCost(state, "d7-spa", {
    original: { currency: "JPY", unit: 24750, quantity: 2 },
    note:
      "HEAD SPA Kuu Omotesando publica ¥24.750 por persona para Premium Head Spa 90 min.",
    link: "https://omotesando.spa-kuu.com/en/menu/",
  });

  updateCost(state, "d8-brother", {
    original: { currency: "JPY", unit: 13750, quantity: 2 },
    note:
      "Precio oficial vigente desde 15 abr 2026: ¥8.800 entrada + SAMURAI LEGEND y ¥4.950 KARAOKE RECORD por persona.",
    link: "https://web.global.brother/joyfactory/index.html",
  });

  return state;
}

export function removePlaceholderNyeDinnerV1(input: TripState): {
  state: TripState;
  migrated: boolean;
} {
  if (input.notes?.[CLEANUP_KEY]) return { state: input, migrated: false };

  const state = structuredClone(input);
  const id = "v7-31-nye";

  state.activities = state.activities.filter((activity) => activity.id !== id);
  state.reservations = state.reservations.filter(
    (reservation) => reservation.activityId !== id,
  );
  state.purchases = state.purchases.filter(
    (purchase) => purchase.activityId !== id,
  );
  state.costs = state.costs.filter(
    (cost) => cost.activityId !== id && cost.id !== id,
  );

  const day31 = state.days.find((day) => day.id === "2026-12-31");
  if (day31) {
    day31.summary =
      "Río y arquitectura por la mañana, café en Kitahama y descenso por Midosuji hasta Amerikamura y Rikuro.";
    day31.why =
      "El día gana contenido sin cruces innecesarios: se recorre Osaka de norte a sur y queda abierta la noche para elegir algo real según lo que esté disponible.";
    day31.routeNote =
      "Nakanoshima → Kitahama → Midosuji → Amerikamura → Rikuro. Confirmar horarios especiales del 31 de diciembre.";
  }

  state.notes = state.notes ?? {};
  state.notes[CLEANUP_KEY] =
    "Se eliminó el placeholder genérico de cena de Nochevieja; no se mostrará una cena sin recomendación concreta.";

  return { state, migrated: true };
}
