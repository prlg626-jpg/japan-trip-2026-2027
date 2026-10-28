import type { Purchase, TripState } from "../types";

const KEY = "confirmed-usj-purchase-2026-10-27-v1";
const ID = "purchase-usj-2026-10-27";
const ACTIVITY = "d27-usj";
const LINK = "https://www.usjticketing.com/";
const DRIVE = "https://drive.google.com/drive/folders/1JFM6H4uOGhTW5Fl3_5_CXosx8gxP3HC1";
const NAME = "Universal Studios Japan · 2 Studio Pass + 2 Express Pass 4: Race & Theater";
const DETAILS = "27 dic 2026 · 2 adultos. Studio Pass: 2 × ¥11.900 = ¥23.800; Express Pass 4: Race & Theater: 2 × ¥20.800 = ¥41.600. Total pagado ¥65.400, impuestos incluidos. SUPER NINTENDO WORLD 16:10–17:10; Mario Kart 16:10–16:40; Yoshi 16:40–17:10 (hora de Japón). Cuatro boletas y correo de confirmación en Drive.";

/** Import the confirmed purchase once, preserving later bank-charge corrections. */
export function applyConfirmedUniversalPurchaseV1(input: TripState): { state: TripState; migrated: boolean } {
  if (input.notes?.[KEY]) return { state: input, migrated: false };
  const state = structuredClone(input);
  const cop = Math.round(65400 * state.settings.fx.JPY);
  const notes = `${DETAILS} Compra del 27 oct 2026 (Colombia); emisión 28 oct en Japón. Tarjeta terminada en 2724. COP estimado con JPY/COP ${state.settings.fx.JPY}; reemplazar por el cargo real de la tarjeta cuando esté disponible.`;
  const purchase: Purchase = {
    id: ID, name: NAME, category: "Actividades", activityId: ACTIVITY,
    city: "Osaka", provider: "Universal Studios Japan · taquilla oficial",
    originalAmount: 65400, currency: "JPY", amountCOP: cop,
    date: "2026-10-27", confirmationNumber: "", status: "Pagado", notes,
    link: LINK, paymentMethodLabel: "Tarjeta terminada en 2724",
    receipt: { url: "", driveUrl: DRIVE, fileName: "Japón 2026 · cuatro boletas USJ y correo", storagePath: "" },
  };
  const existing = state.purchases.findIndex(p => p.id === ID || p.activityId === ACTIVITY);
  if (existing < 0) state.purchases.push(purchase);
  else state.purchases[existing] = { ...state.purchases[existing], ...purchase };
  const activity = state.activities.find(a => a.id === ACTIVITY);
  if (activity) {
    activity.status = "pagada";
    activity.legacyStatus = "Pagado · reserva confirmada";
    activity.actualPaidCOP = cop;
    activity.estimatedCostCOP = cop;
    activity.totalForTwoCOP = cop;
    activity.priceScope = "for_two";
    activity.priceOriginal = { currency: "JPY", unit: 65400, quantity: 1 };
    activity.priceLabel = `¥65.400 pagados para los dos · COP estimado`;
    activity.priceVerifiedAt = "2026-10-27";
    activity.priceDynamic = false;
    activity.description = DETAILS;
    activity.note = notes;
    activity.priceSourceUrl = LINK;
    activity.bookingUrl = LINK;
  }
  const reservation = state.reservations.find(r => r.activityId === ACTIVITY);
  const reservationFields = {
    activityId: ACTIVITY, travelDate: "2026-12-27", name: NAME,
    currentStatus: "PAGADO · CONFIRMADO", opens: "Comprado",
    estimatedPriceCOP: cop, link: LINK, provider: purchase.provider,
    reminderNotes: notes, bookingCheckDate: undefined, bookingCheckLabel: undefined,
    bookingConfidence: undefined, bookingSourceUrl: LINK,
  };
  if (reservation) Object.assign(reservation, reservationFields);
  else state.reservations.push({ id: "res-d27-usj", ...reservationFields });
  state.costs.filter(c => c.id === ACTIVITY || c.activityId === ACTIVITY).forEach(cost => {
    Object.assign(cost, { title: NAME, original: { currency: "JPY", unit: 65400, quantity: 1 },
      estimateCOP: cop, reservationStatus: "PAGADO · CONFIRMADO", reservationCode: "paid",
      opens: "Comprado", note: notes, link: LINK });
  });
  state.notes = { ...state.notes, [KEY]: notes };
  return { state, migrated: true };
}
