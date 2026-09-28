import type { Reservation, TripState } from "../types";

export interface BookingReleaseRule {
  activityId: string;
  checkDate?: string;
  label: string;
  confidence: NonNullable<Reservation["bookingConfidence"]>;
  sourceUrl?: string;
  note: string;
}

export const BOOKING_RELEASE_RULES: Record<string, BookingReleaseRule> = {
  "d25-nex": {
    activityId: "d25-nex",
    checkDate: "2026-11-25",
    label: "25 nov · 10:00 Japón / 24 nov 20:00 Bogotá",
    confidence: "official",
    sourceUrl: "https://www.jreast.co.jp/en/multi/faq/",
    note: "JR East vende asientos reservados desde 1 mes antes a las 10:00 JST.",
  },
  "d25-shink": {
    activityId: "d25-shink",
    checkDate: "2026-09-27",
    label: "Ya disponible en SmartEX",
    confidence: "available",
    sourceUrl: "https://smart-ex.jp/en/product/plan/service/",
    note: "SmartEX permite reservar hasta 1 año antes; el tren/horario definitivo se confirma aproximadamente 1 mes antes.",
  },
  "d27-usj": {
    activityId: "d27-usj",
    checkDate: "2026-10-27",
    label: "27 oct · venta oficial 2 meses antes",
    confidence: "official",
    sourceUrl: "https://www.usj.co.jp/web/ja/jp/tickets/buy/howto",
    note: "USJ indica que la venta normalmente comienza 2 meses antes de la fecha de visita.",
  },
  "v7-28-pokecafe": {
    activityId: "v7-28-pokecafe",
    checkDate: "2026-11-01",
    label: "1 nov · 18:00 Japón / 04:00 Bogotá · estimado",
    confidence: "estimated",
    sourceUrl: "https://www.pokemon-cafe.jp/en/cafe/news/",
    note: "Pokémon Cafe ha venido liberando cada mes completo el día 1 del mes anterior a las 18:00 JST. Diciembre todavía debe confirmarse en NEWS.",
  },
  "v7-28-chopsticks": {
    activityId: "v7-28-chopsticks",
    checkDate: "2026-09-27",
    label: "Revisar / reservar ahora",
    confidence: "available",
    sourceUrl: "https://www.klook.com/en-US/activity/203646-osaka-chopstick-making-workshop-with-local-instructor/",
    note: "La actividad ya tiene página de reserva activa; escoger 28 dic cuando el proveedor muestre ese cupo.",
  },
  "v7-28-matcha": {
    activityId: "v7-28-matcha",
    checkDate: "2026-09-27",
    label: "Revisar / reservar ahora",
    confidence: "available",
    sourceUrl: "https://www.klook.com/en-US/activity/95687-join-tea-ceremony-experience-osaka/",
    note: "La actividad ya tiene página de reserva activa; escoger 28 dic cuando el proveedor muestre ese cupo.",
  },
  "v7-30-kaiyukan": {
    activityId: "v7-30-kaiyukan",
    checkDate: "2026-11-30",
    label: "30 nov · 30 días antes",
    confidence: "official",
    sourceUrl: "https://www.kaiyukan.com/info/faq/",
    note: "KAIYUKAN publica sus e-tickets 30 días antes de la visita.",
  },
  "jan8-suggestion-zp-art-aquarium-ginza": {
    activityId: "jan8-suggestion-zp-art-aquarium-ginza",
    checkDate: "2026-12-01",
    label: "1 dic · empezar a mirar enero",
    confidence: "estimated",
    sourceUrl: "https://ticket.artaquarium.jp/en/application/ticket/?ec=22051210223854&rc=001",
    note: "La ticketera funciona por periodos/calendario y no publica una regla fija de liberación. Fecha de control basada en el patrón mensual observado.",
  },
  "jan8-suggestion-zp-pillow": {
    activityId: "jan8-suggestion-zp-pillow",
    checkDate: "2026-11-01",
    label: "1 nov · revisar agenda de enero",
    confidence: "estimated",
    sourceUrl: "https://www.nihonbashi-nishikawa.com/lp/orderpillow/en/",
    note: "No hay una ventana oficial publicada. La tienda advierte que las citas pueden llenarse con meses de anticipación; la visita se mueve al 8 ene porque reabre desde el 5.",
  },
  "v7-3-kintsugi": {
    activityId: "v7-3-kintsugi",
    checkDate: "2026-09-27",
    label: "Disponible para fechas desde 4 ene · reservar ahora",
    confidence: "available",
    sourceUrl: "https://www.klook.com/en-US/activity/186225-tokyo-kintsugi-making-experience/",
    note: "Se reprograma al 6 ene para respetar la reapertura observada desde el 4 y mantener una ruta lineal Asakusa → Shinjuku → Nakano.",
  },
  "d4-disney": {
    activityId: "d4-disney",
    checkDate: "2026-11-04",
    label: "4 nov · 14:00 Japón / 00:00 Bogotá",
    confidence: "official",
    sourceUrl: "https://www.tokyodisneyresort.jp/en/ticket/index.html",
    note: "Disney vende diariamente la fecha equivalente de 2 meses después desde las 14:00 JST.",
  },
  "v7-5-perfume": {
    activityId: "v7-5-perfume",
    checkDate: "2026-12-22",
    label: "22 dic · 00:00 Japón / 21 dic 10:00 Bogotá",
    confidence: "official",
    sourceUrl: "https://annfragrance.com/en/pages/atelier-ann",
    note: "Atelier ann abre cada fecha exactamente 14 días antes a las 00:00 JST.",
  },
  "v7-6-ring": {
    activityId: "v7-6-ring",
    checkDate: "2026-09-27",
    label: "Revisar / reservar ahora",
    confidence: "available",
    sourceUrl: "https://www.klook.com/en-US/activity/222801-tokyo-vintage-coin-ring-making-workshop-in-shinjuku/",
    note: "La página de reserva ya está activa; confirmar cupo del 6 ene.",
  },
  "d7-jeans": {
    activityId: "d7-jeans",
    checkDate: "2026-09-27",
    label: "Ya disponible · 7 ene 2027 · 11:00",
    confidence: "available",
    sourceUrl:
      "https://www.klook.com/en-US/activity/194175-tokyo-denim-jeans-making-workshop/",
    note:
      "Klook ya permite seleccionar 7 ene 2027 a las 11:00 para 2 personas. Precio observado: US$248,70 total (15% off), ≈ $832.431 COP al cambio consultado.",
  },
  "d7-spa": {
    activityId: "d7-spa",
    checkDate: "2026-11-01",
    label: "1 nov · fecha estimada para enero",
    confidence: "estimated",
    sourceUrl: "https://omotesando.spa-kuu.com/en/",
    note: "El calendario observado llega actualmente hasta 30 nov. Para 2 personas, Kuu indica que hay que escribirles por email; su sistema online acepta solo 1 huésped por reserva.",
  },
  "v7-8-teamlab": {
    activityId: "v7-8-teamlab",
    checkDate: "2026-10-25",
    label: "Desde 25 oct · empezar a mirar finales de octubre",
    confidence: "estimated",
    sourceUrl: "https://teamlabplanets.dmm.com/en",
    note: "teamLab publica por bloques mensuales; su información de grupos indica que diciembre sale a finales de septiembre, así que enero se espera a finales de octubre.",
  },
  "v7-8-brother": {
    activityId: "v7-8-brother",
    checkDate: "2026-10-01",
    label: "1 oct · empezar a revisar enero en OTA",
    confidence: "estimated",
    sourceUrl: "https://web.global.brother/joyfactory/ja/index.html",
    note: "JOYFACTORY vende únicamente por OTA y no publica una cadencia fija. Actualmente el calendario observado llega hasta diciembre; enero debe revisarse desde octubre.",
  },
  "d9-nex": {
    activityId: "d9-nex",
    checkDate: "2026-12-09",
    label: "9 dic · 10:00 Japón / 8 dic 20:00 Bogotá",
    confidence: "official",
    sourceUrl: "https://www.jreast.co.jp/en/multi/faq/",
    note: "JR East vende asientos reservados desde 1 mes antes a las 10:00 JST.",
  },
};

export function bookingReleaseForActivity(activityId: string | null | undefined) {
  return activityId ? BOOKING_RELEASE_RULES[activityId] : undefined;
}

const REBALANCE_KEY = "booking-calendar-rebalance-2026-09-27-v1";

function moveActivity(state: TripState, id: string, dayId: string, start?: string) {
  const activity = state.activities.find((item) => item.id === id);
  if (!activity || !activity.included) return;
  activity.dayId = dayId;
  if (start !== undefined) activity.start = start;

  const zonePlace = state.zonePlaces.find(
    (place) =>
      `jan8-suggestion-${place.id}` === id ||
      `zone-activity-${place.id}` === id ||
      place.title.toLowerCase() === activity.title.toLowerCase(),
  );
  if (zonePlace) zonePlace.suggestedDayId = dayId;
}

function reorderDay(state: TripState, dayId: string, preferredIds: string[]) {
  const rank = new Map(preferredIds.map((id, index) => [id, index]));
  const active = state.activities
    .filter((activity) => activity.dayId === dayId && activity.included)
    .sort((a, b) => {
      const left = rank.get(a.id);
      const right = rank.get(b.id);
      if (left != null && right != null) return left - right;
      if (left != null) return -1;
      if (right != null) return 1;
      return a.order - b.order;
    });
  active.forEach((activity, index) => {
    activity.order = index;
  });
}

export function applyBookingCalendarRebalanceV1(input: TripState): {
  state: TripState;
  migrated: boolean;
} {
  if (input.notes?.[REBALANCE_KEY]) return { state: input, migrated: false };

  const state = structuredClone(input);

  // Nishikawa is closed until Jan 5: move it to the central-Tokyo Jan 8 route.
  moveActivity(state, "jan8-suggestion-zp-pillow", "2027-01-08", "");

  // Keep Art Aquarium on Jan 2 so Jan 8 does not accumulate four ticketed anchors.
  moveActivity(state, "jan8-suggestion-zp-art-aquarium-ginza", "2027-01-02", "");

  // Kintsugi is unavailable before Jan 4. Jan 6 creates a clean east→west route.
  moveActivity(state, "v7-3-kintsugi", "2027-01-06", "10:00");

  reorderDay(state, "2027-01-06", [
    "v7-3-kintsugi",
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

  reorderDay(state, "2027-01-08", [
    "v7-8-teamlab",
    "zone-activity-zp-divercity",
    "zone-activity-zp-odaiba-water",
    "jan8-suggestion-zp-ginza-sony-park",
    "jan8-suggestion-zp-ginza-itoya",
    "jan8-suggestion-zp-pillow",
    "v7-8-brother",
  ]);

  const jan2 = state.days.find((day) => day.id === "2027-01-02");
  if (jan2) {
    jan2.title = "Tsukiji → Ginza / Art Aquarium → Nihonbashi";
    jan2.summary =
      "Mercado y bloque de Ginza con Art Aquarium; después Nihonbashi. La almohada se mueve al 8 porque Nishikawa no reabre hasta el 5.";
    jan2.routeNote =
      "Shimbashi → Tsukiji → Ginza / Art Aquarium → Nihonbashi. Mantener compras flexibles alrededor de la entrada del museo.";
  }

  const jan3 = state.days.find((day) => day.id === "2027-01-03");
  if (jan3) {
    jan3.summary =
      "Iglesia y tarde flexible por Ueno/Asakusa. Kintsugi sale de este día porque el taller no vuelve a operar hasta el 4 de enero.";
  }

  const jan6 = state.days.find((day) => day.id === "2027-01-06");
  if (jan6) {
    jan6.title = "Asakusa → Shinjuku → Nakano";
    jan6.summary =
      "Kintsugi por la mañana en Asakusa; después un único traslado hacia Shinjuku para compras y ring making, cerrando hacia el oeste en Nakano.";
    jan6.why =
      "Mover Kintsugi al 6 evita intentar reservarlo durante el cierre de Año Nuevo y mantiene un recorrido continuo de este a oeste.";
    jan6.routeNote =
      "Asakusa (Kintsugi) → Shinjuku este/centro → ring making → lado oeste → Nakano Broadway.";
  }

  const jan8 = state.days.find((day) => day.id === "2027-01-08");
  if (jan8) {
    jan8.title = "Toyosu / Odaiba → Ginza → Nihonbashi → Kyobashi";
    jan8.summary =
      "teamLab y Odaiba primero; luego bloque central con Ginza, almohada Nishikawa en Nihonbashi y Brother JOYFACTORY en Kyobashi.";
    jan8.why =
      "La almohada se puede hacer después de la reapertura del 5 y encaja mejor en este corredor central que en el día de Shibuya/Harajuku.";
    jan8.routeNote =
      "Shimbashi → Toyosu/Odaiba → Ginza → Nihonbashi (Nishikawa) → Kyobashi (Brother) → hotel.";
  }

  state.notes = state.notes ?? {};
  state.notes[REBALANCE_KEY] =
    "Pillow 2→8 ene; Art Aquarium 8→2 ene; Kintsugi 3→6 ene. No se deseleccionaron actividades.";

  return { state, migrated: true };
}
