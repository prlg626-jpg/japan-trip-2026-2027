import type { TripState, ZonePlace } from "../types";
import { BOOKING_RELEASE_RULES } from "./bookingCalendar2026";

export const PERFUME_PLAN_KEY = "perfume-plan-2026-10-17-v1";
export const LIBERTA_URL = "https://liberta-perfume.com/pages/fullorder/";
export const LIBERTA_BOOKING = BOOKING_RELEASE_RULES["v7-5-perfume"];
const TITLE = "LIBERTA PERFUME Nakameguro · perfume corporal para dos";
const ADDRESS = "1-14-4 Aobadai, Meguro-ku, Tokyo 153-0042";
const DAY = "2027-01-05";
const maps = (query: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

type PerfumeOption = {
  id: string; title: string; zoneId: string; days: string[]; address: string;
  station: string; url: string; hours?: string; note: string; reservation?: boolean;
};

// Addresses and retailer relationships checked against these primary sources on
// 2026-10-17. Coordinates intentionally omitted rather than guessed. Stock and
// New Year opening hours remain subject to confirmation.
export const PERFUME_OPTIONS: PerfumeOption[] = [
  { id: "nose-shinsaibashi", title: "U NOSE SHOP Shinsaibashi · PARCO", zoneId: "osaka-minami", days: ["2026-12-28"], address: "1-8-3 Shinsaibashisuji, Chuo-ku, Osaka · Shinsaibashi PARCO B1F", station: "Shinsaibashi", url: "https://noseshop.jp/pages/shop", hours: "10:00–20:00", note: "Selección de perfumería; el nombre oficial actual es U NOSE SHOP. Combinar con Shinsaibashi PARCO." },
  { id: "nose-umeda", title: "NOSE SHOP Osaka · Umeda LUCUA 1100", zoneId: "osaka-umeda", days: ["2026-12-29"], address: "3-1-3 Umeda, Kita-ku, Osaka · LUCUA 1100 4F", station: "Osaka / Umeda", url: "https://noseshop.jp/pages/shop", hours: "10:30–20:30", note: "Parada opcional en el mismo edificio de @cosme OSAKA." },
  { id: "cosme-ebisubashi", title: "@cosme STORE TSUTAYA EBISUBASHI", zoneId: "osaka-minami", days: ["2026-12-28"], address: "1-8-19 Dotonbori, Chuo-ku, Osaka · TSUTAYA EBISUBASHI 3F", station: "Namba", url: "https://www.cosme.net/store/blog/260907/3596/", hours: "11:00–22:00", note: "Cierre definitivo anunciado para el 11 ene 2027 a las 22:00, después de esta visita. Perfumería y cosmética; confirmar marcas y stock." },
  { id: "cosme-umeda", title: "@cosme OSAKA · Umeda", zoneId: "osaka-umeda", days: ["2026-12-29"], address: "3-1-3 Umeda, Kita-ku, Osaka · LUCUA 1100 3F", station: "Osaka / Umeda", url: "https://www.cosme.net/store/shop/osaka/", hours: "10:30–20:30", note: "Cosmética y fragancias; combinar con NOSE SHOP del piso 4." },
  { id: "flavor-osaka", title: "THE FLAVOR DESIGN Osaka · Minamihorie", zoneId: "osaka-minami", days: ["2026-12-28"], address: "1-14-14 Minamihorie, Nishi-ku, Osaka · #104", station: "Yotsubashi", url: "https://www.theflavordesign.com/store/", hours: "11:00–19:00", note: "Desvío opcional hacia Horie. Flavor Shake crea fabric mist para textiles; no sustituye el perfume corporal de LIBERTA. El taller requiere consultar reserva y precio aparte." },
  { id: "satori", title: "Parfum Satori · Roppongi", zoneId: "tokyo-roppongi-akasaka", days: ["2027-01-02", "2027-01-08"], address: "3-6-8 Roppongi, Minato-ku, Tokyo · OURS 2F", station: "Roppongi / Roppongi-itchome", url: "https://parfum-satori.com/?mode=f12", hours: "11:00–17:00 · última entrada 16:30", note: "Boutique de perfumes japoneses. Cierra por Año Nuevo: fecha de reapertura pendiente; no asumir apertura el 2 ene. El 8 ene implica un desvío desde Ginza, solo si queda tiempo." },
  { id: "flavor-tokyo", title: "THE FLAVOR DESIGN Tokyo · Shibuya", zoneId: "tokyo-shibuya-aoyama", days: ["2027-01-05"], address: "3-5-1 Shibuya, Shibuya-ku, Tokyo · Grand Heights #101", station: "Shibuya", url: "https://www.theflavordesign.com/store/tokyo/", hours: "11:00–18:00 entre semana · miércoles cerrado", note: "Fabric mist para textiles, visita opcional tras LIBERTA; taller, reserva y costo por confirmar." },
  { id: "nose-shinjuku", title: "NOSE SHOP Shinjuku · NEWoMan", zoneId: "tokyo-shinjuku-nakano", days: ["2027-01-06"], address: "4-1-6 Shinjuku, Shinjuku-ku, Tokyo · NEWoMan Shinjuku 2F", station: "Shinjuku", url: "https://noseshop.jp/pages/shop", hours: "11:00–20:30 lunes a sábado · domingo/festivos hasta 20:00", note: "Perfumería nicho junto a la estación. No se atribuye çanoma a esta sucursal: la lista actual verificada la sitúa en otros distribuidores." },
  { id: "cosme-tokyo", title: "@cosme TOKYO · Harajuku", zoneId: "tokyo-shibuya-aoyama", days: ["2027-01-05"], address: "1-14-27 Jingumae, Shibuya-ku, Tokyo", station: "Harajuku", url: "https://www.cosme.net/store/flagship/tokyo/", hours: "11:00–21:00", note: "Cosmética y fragancias. J-Scent y çanoma figuran en sus listas oficiales de distribuidores; surtido y stock por confirmar." },
  { id: "j-scent", title: "J-Scent · Ginza Tsutaya Books", zoneId: "tokyo-ginza-central", days: ["2027-01-02", "2027-01-08"], address: "6-10-1 Ginza, Chuo-ku, Tokyo · GINZA SIX 6F", station: "Ginza", url: "https://luzfragrance.pro/j-scent/storelist", note: "Punto de venta confirmado por J-Scent; no es una boutique propia. Confirmar fragancias disponibles." },
  { id: "kitowa", title: "KITOWA · Ginza Mitsukoshi", zoneId: "tokyo-ginza-central", days: ["2027-01-02", "2027-01-08"], address: "4-6-16 Ginza, Chuo-ku, Tokyo · Ginza Mitsukoshi 5F / 7F", station: "Ginza", url: "https://www.kitowa.co.jp/pages/shop-list", note: "Distribuidor: cosmética masculina 5F y Japan Edition 7F. Confirmar qué perfumes/productos tienen; no es tienda propia." },
  { id: "canoma", title: "çanoma · Ginza Tsutaya Books", zoneId: "tokyo-ginza-central", days: ["2027-01-02", "2027-01-08"], address: "6-10-1 Ginza, Chuo-ku, Tokyo · GINZA SIX 6F", station: "Ginza", url: "https://canoma-parfum.com/pages/stores", note: "Distribuidor confirmado por çanoma. Mismo local que la opción J-Scent: se pueden combinar en una sola visita; stock por confirmar." },
  { id: "di-ser", title: "DI SER · amritara house Omotesando", zoneId: "tokyo-shibuya-aoyama", days: ["2027-01-05"], address: "5-12-12 Jingumae, Shibuya-ku, Tokyo · J-Wing Right 1F", station: "Meiji-jingumae / Omotesando", url: "https://www.diser-parfum.com/en/index.html", hours: "11:00–19:30 según DI SER", note: "Distribuidor confirmado por DI SER; fragancias naturales japonesas. Confirmar stock antes de ir." },
  { id: "le-labo", title: "Le Labo · Aoyama", zoneId: "tokyo-shibuya-aoyama", days: ["2027-01-05"], address: "5-5-24 Minamiaoyama, Minato-ku, Tokyo", station: "Omotesando", url: "https://www.lelabofragrances.jp/locations", hours: "11:00–20:00", note: "Boutique de Aoyama confirmada. Se evita depender de Daikanyama, cuya ficha oficial advierte cierre temporal." },
  { id: "sholayered", title: "SHOLAYERED · Harakado Harajuku", zoneId: "tokyo-shibuya-aoyama", days: ["2027-01-05"], address: "6-31-21 Jingumae, Shibuya-ku, Tokyo · Tokyu Plaza Harajuku Harakado 2F", station: "Meiji-jingumae", url: "https://sholayered.jp/pages/stores", hours: "11:00–21:00", note: "Perfumes japoneses; parada opcional en Harajuku." },
  { id: "edith", title: "ĖDIT(h) · Kagurazaka", zoneId: "tokyo-kagurazaka-perfume", days: ["2027-01-06"], address: "3-2 Kagurazaka, Shinjuku-ku, Tokyo · SunPlace Hondayokocho 1F", station: "Iidabashi / Kagurazaka", url: "https://edithtokyo.com/en/stores_en/", note: "Flagship confirmado. Desvío opcional en tren desde Shinjuku; no queda en el recorrido directo hacia Nakano. Ir solo si sobra tiempo." },
  { id: "fukushi", title: "FUKUSHI 馥至 · Asakusa", zoneId: "tokyo-ueno-asakusa", days: ["2027-01-03", "2027-01-06"], address: "1-5-2 Hanakawado, Taito-ku, Tokyo · Satellite Fuji Building 10F", station: "Asakusa", url: "https://www.fukushijp.com/en/access", note: "Estudio de creación de perfume; requiere confirmar cita, precio y apertura de Año Nuevo. Opcional al pasar por Asakusa; no se ha reservado.", reservation: true },
];

function optionPlace(option: PerfumeOption, index: number): ZonePlace {
  return {
    id: `perfume-option-${option.id}`, zoneId: option.zoneId, title: option.title,
    description: option.note, category: "shopping", subCategory: "Perfumería",
    priorityRank: "niche", lat: null, lon: null, address: option.address,
    nearestStation: option.station, estimatedDurationMinutes: option.reservation ? 90 : 30,
    priceScope: "variable", priceOriginal: null,
    priceLabel: "Compra opcional · precio según producto; sin importe presupuestado",
    reservationRequired: Boolean(option.reservation), openingHours: option.hours ?? "Consultar horario oficial",
    holidayNote: "Ubicación verificada el 17 oct 2026. Confirmar apertura de Año Nuevo y stock. " + option.note,
    officialUrl: option.url, googleMapsUrl: maps(`${option.title}, ${option.address}`),
    sourceIds: [`source-perfume-${option.id}`], ratingContext: "Ubicación y distribuidor verificados en fuente oficial",
    seasonalFit: "Opcional; solo añadir si queda tiempo en esta zona", selected: false,
    suggestedDayId: option.days[0], suggestionDayIds: option.days, order: 1000 + index,
  };
}

// Read-time catalogue also works for live trips which have not persisted the
// migration yet. Selections still come exclusively from the user's live state.
export function perfumeSuggestionPlaces(): ZonePlace[] {
  return PERFUME_OPTIONS.map(optionPlace);
}

/** Apply only to the state chosen by sync, never by importing a replacement seed.
 * The durable marker makes later edits, deletions and selections authoritative.
 * No purchases, receipts, unrelated days or decision timestamps are changed.
 */
export function applyPerfumePlan2027(input: TripState): TripState {
  if (input.notes?.[PERFUME_PLAN_KEY]) return input;
  const state = structuredClone(input);
  state.notes = state.notes ?? {};
  const activity = state.activities.find(a => a.id === "v7-5-perfume");
  const estimate = Math.round(34000 * state.settings.fx.JPY);
  const note = "2 personas · EDP corporal 50 ml por persona desde ¥17.000 (¥34.000 los dos), más ingredientes premium opcionales. Consulta de 60 min y 30–60 min de preparación; reservar margen hasta las 13:00. 11:00 es hora deseada, sin confirmar. " + LIBERTA_BOOKING.note;
  // Respect an intentional move to the protected birthday even in custom states.
  if (activity && activity.dayId !== "2027-01-07") {
    Object.assign(activity, {
      dayId: DAY, title: TITLE, place: "LIBERTA PERFUME Nakameguro", address: ADDRESS,
      start: "11:00", end: "13:00", durationMinutes: 120,
      estimatedDurationMinutes: 120, recommendedVisitMinutes: 120,
      lat: null, lon: null, nearestStation: "Nakameguro · 8 min a pie",
      zoneId: "tokyo-nakameguro-perfume", bookingUrl: LIBERTA_BOOKING.sourceUrl,
      googleMapsUrl: maps(`LIBERTA PERFUME ${ADDRESS}`),
      status: "pendiente_de_reservar", legacyStatus: "Pendiente de reservar",
      description: "Crear su perfume para la piel con un perfumista en Nakameguro. " + note,
      note: [activity.note, note].filter(Boolean).join("\n"),
      priceScope: "per_person", priceOriginal: { currency: "JPY", unit: 17000, quantity: 1 },
      priceLabel: "Desde ¥17.000 por persona · ¥34.000 los dos + extras",
      priceVerifiedAt: "2026-10-17", priceSourceUrl: LIBERTA_URL, priceDynamic: true,
      estimatedCostCOP: estimate, totalForTwoCOP: estimate, costItemId: activity.costItemId ?? "d5-perfume",
      reservationRequired: true, bookingLabel: LIBERTA_BOOKING.label,
      openingHours: "Según cita disponible en el calendario oficial",
      holidayNote: "Apertura y cita del 5 ene pendientes de confirmar.",
    });
    if (activity.included) {
      const others = state.activities.filter(a => a.dayId === DAY && a.included && a.id !== activity.id).sort((a,b) => a.order - b.order);
      activity.order = 0;
      others.forEach((a,index) => { a.order = index + 1; });
    }
    if (!state.reservations.some(r => r.activityId === activity.id || r.activityId === "d5-perfume" || r.id === "res-d5-perfume")) {
      state.reservations.push({ id: "res-d5-perfume", activityId: activity.id, travelDate: DAY, name: TITLE, currentStatus: "POR RESERVAR", opens: LIBERTA_BOOKING.label, estimatedPriceCOP: estimate, link: LIBERTA_BOOKING.sourceUrl!, provider: "LIBERTA PERFUME", reminderNotes: note });
    }
    for (const r of state.reservations.filter(r => r.travelDate !== "2027-01-07" && (r.activityId === activity.id || r.activityId === "d5-perfume" || r.id === "res-d5-perfume"))) {
      Object.assign(r, { activityId: activity.id, travelDate: DAY, name: TITLE, currentStatus: "POR RESERVAR",
        estimatedPriceCOP: estimate, link: LIBERTA_BOOKING.sourceUrl, provider: "LIBERTA PERFUME · web oficial",
        opens: LIBERTA_BOOKING.label, reminderNotes: note, bookingCheckDate: undefined,
        bookingCheckLabel: LIBERTA_BOOKING.label, bookingConfidence: "estimated", bookingSourceUrl: LIBERTA_BOOKING.sourceUrl });
    }
    if (!state.costs.some(c => c.activityId === activity.id || c.id === "d5-perfume" || c.id === activity.costItemId)) {
      state.costs.push({ id: activity.costItemId!, activityId: activity.id, date: DAY, title: TITLE, category: "Actividades", original: { currency: "JPY", unit: 17000, quantity: 2 }, estimateCOP: estimate, reservationStatus: "POR RESERVAR", reservationCode: "", opens: LIBERTA_BOOKING.label, note, link: LIBERTA_BOOKING.sourceUrl! });
    }
    for (const c of state.costs.filter(c => c.date !== "2027-01-07" && (c.activityId === activity.id || c.id === "d5-perfume" || c.id === activity.costItemId))) {
      Object.assign(c, { activityId: activity.id, title: TITLE, date: DAY,
        original: { currency: "JPY", unit: 17000, quantity: 2 }, estimateCOP: estimate,
        reservationStatus: "POR RESERVAR", reservationCode: "", opens: LIBERTA_BOOKING.label,
        note, link: LIBERTA_BOOKING.sourceUrl });
    }
    // Cached legs targeted the previous Omotesando address. Recompute from the
    // current order; never retain their old time/fare or label them verified.
    state.routeSegments = state.routeSegments.filter(s => !(s.dayId === DAY && (s.fromId === activity.id || s.toId === activity.id)));
    const day = state.days.find(d => d.id === DAY);
    if (day) {
      day.title = "Nakameguro · LIBERTA → Aoyama / Harajuku / Shibuya";
      day.summary = "Primero LIBERTA en Nakameguro, con las 11:00 como hora deseada sin confirmar. Después continuar con las actividades ya elegidas de Aoyama, Harajuku y Shibuya; perfumerías adicionales solo si queda tiempo.";
      day.why = "La creación de perfume pasa a Nakameguro y va primero. El resto conserva su orden actual; las visitas extra son opcionales.";
      day.zoneIds = [...new Set([...(day.zoneIds ?? []), "tokyo-nakameguro-perfume"])];
      day.routeNote = "11:00 deseada en LIBERTA Nakameguro (sin reserva); consulta y recogida hasta aprox. 13:00. Después continuar con las actividades elegidas de Shibuya / Harajuku / Aoyama. Confirmar transportes en Maps. " + day.routeNote.replace(/Atelier ann(?: Omotesando)?/gi, "LIBERTA PERFUME Nakameguro");
      const hotel = state.hotels.find(h => h.id === day.hotelId);
      day.dayRoute = { city: "Tokyo", from: hotel?.name ?? "Hotel Tokyo", to: `LIBERTA PERFUME ${ADDRESS}`,
        text: "Hotel → LIBERTA PERFUME Nakameguro → Aoyama / Harajuku / Shibuya según selecciones actuales → hotel",
        googleMapsUrl: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(hotel?.name ?? "Shimbashi Station Tokyo")}&destination=${encodeURIComponent(`LIBERTA PERFUME ${ADDRESS}`)}&travelmode=transit` };
    }
  }
  const newZones = [
    { id: "tokyo-nakameguro-perfume", name: "Nakameguro · LIBERTA", day: DAY, lat: 35.644, lon: 139.699 },
    { id: "tokyo-kagurazaka-perfume", name: "Kagurazaka · desvío opcional", day: "2027-01-06", lat: 35.701, lon: 139.74 },
  ];
  for (const zone of newZones) {
    if (!state.zones.some(z => z.id === zone.id)) state.zones.push({ id: zone.id, name: zone.name, city: "Tokyo", aliases: [], description: "Perfumería opcional", center: { lat: zone.lat, lon: zone.lon }, hotelId: null, themeColor: "#FFEAF3", recommendedDayIds: [zone.day], tags: ["perfumería"] });
  }
  PERFUME_OPTIONS.forEach((option, index) => {
    const place = optionPlace(option, index);
    if (!state.zonePlaces.some(p => p.id === place.id)) state.zonePlaces.push(place);
    if (!state.sources.some(s => s.id === place.sourceIds[0])) state.sources.push({ id: place.sourceIds[0], type: "official", handle: option.title, url: option.url, note: "Verificado 17 oct 2026: " + option.note, used: option.days, associatedActivityIds: [] });
  });
  state.notes[PERFUME_PLAN_KEY] = "LIBERTA 5 ene para dos, pendiente. Sugerencias opcionales verificadas. 7 ene intacto. Consulta calendario: 17 oct 2026 Bogotá; 5 ene no seleccionable, sin confirmar horario.";
  return state;
}
