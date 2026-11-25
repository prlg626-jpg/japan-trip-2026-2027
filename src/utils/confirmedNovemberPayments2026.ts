import type { Purchase, TripState } from "../types";

export const NOVEMBER_PAYMENTS_KEY = "confirmed-payments-2026-11-25-v1";
export const NOVEMBER_PAID_ACTIVITIES = ["d25-shink", "d7-spa", "v7-3-kintsugi", "v7-8-brother"];
const EUR_COP = 3853.35;
const EUR_SOURCE = "https://www.exchangerate24.com/euro-to-colombian-peso/";

const PAYMENTS = [
  { activityId: "d25-shink", id: "purchase-shinkansen-2003-2026-11-25", name: "Shinkansen · Nozomi 195 · Green Car · 2 adultos", category: "Transporte", city: "Tokyo → Osaka", provider: "SmartEX · JR Central", amount: 39180, currency: "JPY", code: "2003", day: "2026-12-25", start: "16:46", end: "19:06", link: "https://smart-ex.jp/en/", detail: "Shinagawa 16:46 → Shin-Osaka 19:06. Green Car, vagón 8, puestos 17C y 17D, juntos y con zona de equipaje grande detrás de los asientos. Dos adultos. QR/billetes por obtener desde My Trips. No incluye Narita Express ni trenes locales." },
  { activityId: "d7-spa", id: "purchase-kuu-2026-11-25", name: "HEAD SPA Kuu Omotesando · Premium 120 min + adicionales · 2 personas", category: "Actividades", city: "Tokyo", provider: "HEAD SPA Kuu Omotesando", amount: 74000, currency: "JPY", code: "", day: "2027-01-07", start: "16:00", end: "18:40", link: "https://omotesando.spa-kuu.com/en/", detail: "Pago confirmado por recibo Stripe: Premium Head Spa 120 min ¥66.000 + Head Soak ¥6.000 + Scalp Carbonated Spray ¥2.000, para dos. Cita solicitada para 7 ene 2027 a las 16:00, sucursal Omotesando. Bloque hasta 18:40 con margen orientativo para consulta/cambio/secado; confirmar duración total con el salón. Su mensaje escribió 2026 por error: corrección del año y acuse del pago pendientes del salón. Pago no reembolsable según las condiciones enviadas." },
  { activityId: "v7-3-kintsugi", id: "purchase-klook-XPJ251840-2026-11-25", name: "Kintsugi en Asakusa · 2 adultos", category: "Actividades", city: "Tokyo", provider: "Klook · Traveling Tokyo", amount: 34.13, currency: "EUR", code: "XPJ251840", day: "2027-01-06", start: "10:00", end: "11:00", link: "https://www.klook.com/en-US/activity/186225-tokyo-kintsugi-making-experience/", detail: "Reserva confirmada para 6 ene 2027 10:00, dos adultos. Llegar 5 minutos antes. Punto de encuentro comunicado por el operador: Asakusa TOSEI Building, piso 10. Bono enviado por correo. Pedido Klook 5608980122: pago real total €214,04, repartido en Kintsugi €34,13 y Brother €179,91. El recibo menciona garantía/seguro €15,86; no se suma otra vez al pago real." },
  { activityId: "v7-8-brother", id: "purchase-klook-WUG357201-2026-11-25", name: "Brother JOYFACTORY · Plus One para Karaoke Record / vinilo · 2 adultos", category: "Actividades", city: "Tokyo", provider: "Klook · BROTHER JOYFACTORY TOKYO", amount: 179.91, currency: "EUR", code: "WUG357201", day: "2027-01-08", start: "16:00", end: "18:00", link: "https://www.klook.com/activity/231519-brother-joyfactory-tokyo-entry-ticket-samurai-experience-tokyo/", detail: "Reserva confirmada para 8 ene 2027 16:00, dos adultos. Plus One (Samurai + una actividad a elegir): objetivo Karaoke Record, grabar y llevar el vinilo. No se planifica participar en Samurai. La elección de Karaoke Record se solicita dentro del recinto, sujeta a disponibilidad; el paquete no garantiza esa elección concreta. Pendiente registrar los participantes mediante el correo oficial de Brother para obtener el QR. Pedido Klook 5608980122; parte del pago real €214,04, sin añadir nuevamente la garantía/seguro." },
];

/** Record evidence once, without replacing later edits or actual bank charges. */
export function applyConfirmedNovemberPayments(input: TripState): { state: TripState; migrated: boolean } {
  if (input.notes?.[NOVEMBER_PAYMENTS_KEY]) return { state: input, migrated: false };
  const state = structuredClone(input);
  for (const item of PAYMENTS) {
    const rate = item.currency === "EUR" ? EUR_COP : state.settings.fx.JPY;
    const cop = Math.round(item.amount * rate);
    const notes = `${item.detail} Pagado el 25 nov 2026 con tarjeta terminada en 2724. COP estimado a ${rate} COP/${item.currency}; no es el cargo bancario real. ${item.currency === "EUR" ? `Referencia EUR/COP del 25 nov 2026: ${EUR_SOURCE}.` : "Tasa JPY/COP configurada en el planeador."}`;
    const purchase: Purchase = { id: item.id, name: item.name, activityId: item.activityId, category: item.category, city: item.city, provider: item.provider, originalAmount: item.amount, currency: item.currency, amountCOP: cop, date: "2026-11-25", confirmationNumber: item.code, status: "Pagado", paymentMethodLabel: "Tarjeta terminada en 2724", notes, link: item.link, receipt: { url: "", driveUrl: "", fileName: "", storagePath: "" } };
    const existing = state.purchases.findIndex(p => p.id === item.id || p.activityId === item.activityId);
    if (existing < 0) state.purchases.push(purchase);
    else state.purchases[existing] = { ...state.purchases[existing], ...purchase };
    const activity = state.activities.find(a => a.id === item.activityId);
    if (activity) Object.assign(activity, { dayId: item.day, start: item.start, end: item.end, durationMinutes: item.activityId === "d7-spa" ? 160 : item.activityId === "d25-shink" ? 140 : item.activityId === "v7-8-brother" ? 120 : 60, status: "pagada", legacyStatus: "Pagado · reserva registrada", title: item.name, description: item.detail, note: notes, bookingLabel: "Pagado · " + (item.code || "acuse del salón pendiente"), actualPaidCOP: 0, estimatedCostCOP: cop, totalForTwoCOP: cop, priceScope: "for_two", priceOriginal: { currency: item.currency, unit: item.amount, quantity: 1 }, priceLabel: `${item.currency} ${item.amount.toLocaleString("es-CO")} pagados para los dos · COP estimado`, priceVerifiedAt: "2026-11-25", priceDynamic: false, bookingUrl: item.link, priceSourceUrl: item.link });
    for (const cost of state.costs.filter(c => c.activityId === item.activityId || c.id === activity?.costItemId || c.id === item.activityId)) Object.assign(cost, { title: item.name, original: { currency: item.currency, unit: item.amount, quantity: 1 }, estimateCOP: cop, reservationStatus: "PAGADO", reservationCode: "paid", opens: "Comprado", note: notes, link: item.link });
    const reservationFields = { activityId: item.activityId, travelDate: item.day, name: item.name, currentStatus: "PAGADO", opens: "Comprado", estimatedPriceCOP: cop, link: item.link, provider: item.provider, reminderNotes: notes };
    const reservation = state.reservations.find(r => r.activityId === item.activityId || r.activityId === activity?.costItemId);
    if (reservation) Object.assign(reservation, reservationFields);
    else state.reservations.push({ id: `res-paid-${item.activityId}`, ...reservationFields });
  }
  const ring = state.activities.find(a => a.id === "v7-6-ring");
  if (ring) Object.assign(ring, { included: false, status: "idea", legacyStatus: "Descartado · no comprado", bookingLabel: "Descartado por esfuerzo manual", note: "El usuario descartó el taller de anillos el 25 nov 2026: requiere demasiado esfuerzo manual. No comprado. Buscar una alternativa suave para ambos." });
  const rest = state.activities.find(a => a.id === "d7-rest");
  if (rest) Object.assign(rest, { start: "18:40", end: "19:00", durationMinutes: 20, note: "Pausa orientativa después del spa; confirmar duración del salón antes de fijar cualquier reserva siguiente." });
  const jan6 = state.days.find(d => d.id === "2027-01-06");
  if (jan6) Object.assign(jan6, { summary: "Kintsugi reservado a las 10:00 en Asakusa; después Shinjuku y compras flexibles. Taller de anillos descartado y sin pago. Alternativa suave para ambos pendiente.", routeNote: "Asakusa (Kintsugi) → Shinjuku → Nakano. Sin taller de anillos; no reservar otra actividad manual con esfuerzo sin revisar." });
  state.notes = { ...state.notes, [NOVEMBER_PAYMENTS_KEY]: "Cuatro pagos confirmados: Shinkansen ¥39.180, Kuu ¥74.000, Kintsugi €34,13 y Brother €179,91, todos con 2724. Taller de anillos descartado y no comprado. Valores COP estimados; sustituir por los cargos bancarios cuando estén disponibles." };
  return { state, migrated: true };
}
