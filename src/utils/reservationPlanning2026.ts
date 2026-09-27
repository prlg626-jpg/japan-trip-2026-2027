import type { TripState } from "../types";

const DEC26_ROUTE_KEY = "dec26-route-review-2026-09-27-v1";

function mapsDirections(from: string, to: string) {
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&travelmode=transit`;
}

function patchActivity(
  state: TripState,
  id: string,
  patch: Partial<TripState["activities"][number]>,
) {
  const activity = state.activities.find((item) => item.id === id);
  if (activity) Object.assign(activity, patch);
}

export function applyReservationPlanningCopy(input: TripState): TripState {
  const state = structuredClone(input);

  patchActivity(state, "v7-30-kaiyukan", {
    title: "Osaka Aquarium KAIYUKAN · tiburón ballena",
    description:
      "Gran acuario de Osaka en la bahía de Tempozan. El recorrido baja en espiral alrededor del enorme tanque del Pacífico, donde se exhibe el tiburón ballena; calcula unas 2–2½ horas.",
    note:
      "Gran acuario de Osaka en la bahía de Tempozan. El recorrido baja en espiral alrededor del enorme tanque del Pacífico, donde se exhibe el tiburón ballena; calcula unas 2–2½ horas.",
    estimatedDurationMinutes: 150,
    recommendedVisitMinutes: 150,
    priceScope: "per_person",
    priceOriginal: { currency: "JPY", unit: 3200, quantity: 1 },
    priceLabel:
      "Tarifa dinámica · normalmente ¥2.700–¥3.200 por adulto; algunas fechas llegan a ¥3.500",
    priceVerifiedAt: "2026-09-27",
    priceSourceUrl: "https://www.kaiyukan.com/info/ticket/kaiyukan/",
    priceDynamic: true,
  });

  patchActivity(state, "v7-3-kintsugi", {
    title: "Taller de Kintsugi · reparar cerámica con oro",
    description:
      "Taller práctico en Asakusa para aprender kintsugi: reparar una pieza de cerámica resaltando las grietas con laca y acabado dorado. Te llevas la pieza reparada.",
    note:
      "Taller práctico en Asakusa para aprender kintsugi: reparar una pieza de cerámica resaltando las grietas con laca y acabado dorado. Te llevas la pieza reparada.",
    estimatedDurationMinutes: 105,
    recommendedVisitMinutes: 105,
    priceScope: "per_person",
    priceOriginal: { currency: "USD", unit: 23.79, quantity: 1 },
    priceLabel: "US$23,79 por persona observado en Klook · precio dinámico",
    priceVerifiedAt: "2026-09-27",
    priceSourceUrl:
      "https://www.klook.com/en-US/activity/186225-tokyo-kintsugi-making-experience/",
    priceDynamic: true,
  });

  patchActivity(state, "jan8-suggestion-zp-art-aquarium-ginza", {
    title: "Art Aquarium Museum GINZA · goldfish + arte",
    description:
      "Museo inmersivo dentro de Ginza Mitsukoshi: acuarios de goldfish combinados con iluminación, escenografía y arte. Calcula 60–90 minutos.",
    estimatedDurationMinutes: 90,
    recommendedVisitMinutes: 90,
    priceScope: "per_person",
    priceOriginal: { currency: "JPY", unit: 2500, quantity: 1 },
    priceLabel: "¥2.500 por persona en la web oficial · ¥5.000 para los dos",
    priceVerifiedAt: "2026-09-27",
    priceSourceUrl: "https://ticket.artaquarium.jp/",
    priceDynamic: false,
  });

  patchActivity(state, "jan8-suggestion-zp-pillow", {
    title: "Nihonbashi Nishikawa · almohada a medida",
    description:
      "Te miden la altura de cabeza y cuello, pruebas materiales y ajustan una almohada personalizada. El precio corresponde a comprar la almohada, no a pagar la cita.",
    note:
      "Te miden la altura de cabeza y cuello, pruebas materiales y ajustan una almohada personalizada. El precio corresponde a comprar la almohada, no a pagar la cita.",
    estimatedDurationMinutes: 60,
    recommendedVisitMinutes: 60,
    priceScope: "per_item",
    priceOriginal: { currency: "JPY", unit: 33000, quantity: 2 },
    priceLabel: "¥33.000 por almohada regular · ¥66.000 si hacen dos",
    priceVerifiedAt: "2026-09-27",
    priceSourceUrl: "https://www.nihonbashi-nishikawa.com/products/pillow/1370/",
    priceDynamic: false,
  });

  patchActivity(state, "d4-disney", {
    title: "Tokyo DisneySea",
    description:
      "Día completo en Tokyo DisneySea. Para el 4 de enero de 2027 el calendario oficial publicado muestra ¥9.900 por adulto.",
    note:
      "Día completo en Tokyo DisneySea. Para el 4 de enero de 2027 el calendario oficial publicado muestra ¥9.900 por adulto.",
    estimatedDurationMinutes: 720,
    recommendedVisitMinutes: 720,
    priceScope: "per_person",
    priceOriginal: { currency: "JPY", unit: 9900, quantity: 1 },
    priceLabel: "¥9.900 por adulto el 4 ene 2027 · ¥19.800 para los dos",
    priceVerifiedAt: "2026-09-27",
    priceSourceUrl:
      "https://www.tokyodisneyresort.jp/en/ticket/index/202701/?park=tds",
    priceDynamic: false,
  });

  patchActivity(state, "v7-5-perfume", {
    title: "Atelier ann Omotesando · crear fragancia",
    description:
      "Experiencia de 50 minutos para elegir cinco aromas, mezclarlos con el perfumista y crear un Fabric Mist personalizado de 50 ml.",
    estimatedDurationMinutes: 50,
    recommendedVisitMinutes: 50,
    priceScope: "per_person",
    priceOriginal: { currency: "JPY", unit: 6050, quantity: 1 },
    priceLabel: "¥6.050 por persona · ¥12.100 para los dos",
    priceVerifiedAt: "2026-09-27",
    priceSourceUrl: "https://annfragrance.com/en/pages/atelier-ann",
    priceDynamic: false,
  });

  return state;
}

export function applyDec26RouteReviewV1(input: TripState): {
  state: TripState;
  migrated: boolean;
} {
  const alreadyMigrated = Boolean(input.notes?.[DEC26_ROUTE_KEY]);
  const state = structuredClone(input);
  const day = state.days.find((item) => item.id === "2026-12-26");
  if (!day) return { state, migrated: false };

  // Keep exactly the user's selected activities. The ordering migration happens
  // once; the route copy below is idempotent because an older runtime patch may
  // still rewrite the dayRoute before this final protected-state pass.
  if (!alreadyMigrated) {
    const preferred = [
      "v7-26-history",
      "v7-26-castlepark",
      "zone-activity-zp-okawa",
      "v7-26-tenjin",
      "zone-activity-zp-nakanoshima26",
    ];
    const rank = new Map(preferred.map((id, index) => [id, index]));

    const active = state.activities
      .filter((activity) => activity.dayId === day.id && activity.included)
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

  patchActivity(state, "v7-26-history", {
    estimatedDurationMinutes: 90,
    recommendedVisitMinutes: 90,
    openingHours: "9:30–17:00 · última entrada 16:30",
    holidayNote: "Cierra del 28 dic al 4 ene; el 26 es buen día para verlo.",
  });
  patchActivity(state, "v7-26-castlepark", {
    estimatedDurationMinutes: 75,
    recommendedVisitMinutes: 75,
  });
  patchActivity(state, "zone-activity-zp-okawa", {
    estimatedDurationMinutes: 60,
    recommendedVisitMinutes: 60,
  });
  patchActivity(state, "v7-26-tenjin", {
    estimatedDurationMinutes: 90,
    recommendedVisitMinutes: 90,
  });
  patchActivity(state, "zone-activity-zp-nakanoshima26", {
    estimatedDurationMinutes: 60,
    recommendedVisitMinutes: 60,
  });

  day.title = "Osaka en circuito · historia → castillo → río → Tenjinbashi → Nakanoshima";
  day.pace = "Medio / flexible";
  day.summary =
    "Primero el Museo de Historia por su horario; luego Osaka Castle Park, paseo por Sakuranomiya, Tenjinbashi-suji y cierre en Nakanoshima antes de volver al hotel.";
  day.why =
    "El orden forma un circuito y evita el zigzag anterior. El Museo de Historia va primero porque cierra a las 17:00 y entra en cierre de Año Nuevo desde el 28.";
  day.routeNote =
    "Hotel → Osaka Museum of History → Osaka Castle Park → Kema Sakuranomiya Park → Tenjinbashi-suji → Nakanoshima Park → hotel. Ningún tramo requiere reserva; usa IC card y Maps según el tráfico/transporte del momento.";
  day.dayRoute = {
    city: "Osaka",
    text:
      "Hotel Monterey Le Frere Osaka → Osaka Museum of History → Osaka Castle Park → Kema Sakuranomiya Park → Tenjinbashi-suji → Nakanoshima Park → Hotel Monterey Le Frere Osaka.",
    from: "Hotel Monterey Le Frere Osaka",
    to: "Osaka Museum of History",
    googleMapsUrl: mapsDirections(
      "Hotel Monterey Le Frere Osaka",
      "Osaka Museum of History",
    ),
  };

  state.notes = state.notes ?? {};
  if (!alreadyMigrated) {
    state.notes[DEC26_ROUTE_KEY] =
      "Reordenado sin cambiar selecciones: History → Castle Park → Sakuranomiya → Tenjinbashi → Nakanoshima.";
  }

  return { state, migrated: !alreadyMigrated };
}
