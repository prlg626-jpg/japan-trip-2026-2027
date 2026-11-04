import type { Purchase, TripState } from "../types";

const KEY = "confirmed-disneysea-purchase-2026-11-04-v1";
const ACTIVITY = "d4-disney";
const ID = "purchase-disneysea-2026-11-04";
const LINK = "https://plan.tokyodisneyresort.jp/account/orderhistory/show/?lang=en";
const DRIVE = "https://drive.google.com/drive/folders/1JFM6H4uOGhTW5Fl3_5_CXosx8gxP3HC1";
const NAME = "Tokyo DisneySea · 2 adultos · 1-Day Passport";
const DETAILS = "4 ene 2027 · 2 entradas normales de adulto (1-Day Passport), ¥9.900 cada una. Total pagado ¥19.800, impuestos incluidos. Confirmado por correo oficial de Tokyo Disney Resort. Dos QR y correo de confirmación guardados en la carpeta privada de Japón en Drive. Usar la app Tokyo Disney Resort; el correo con los códigos sirve como alternativa si no pueden usar la app.";

/** Apply once; later edits and actual card charges remain authoritative. */
export function applyConfirmedDisneyPurchaseV1(input: TripState): { state: TripState; migrated: boolean } {
  if (input.notes?.[KEY]) return { state: input, migrated: false };
  const state = structuredClone(input);
  const cop = Math.round(19800 * state.settings.fx.JPY);
  const notes = `${DETAILS} Compra del 4 nov 2026 en Colombia; comprobante fechado 5 nov 2026 00:19 en Japón. Tarjeta terminada en 2724, según el titular. COP estimado con tasa JPY/COP ${state.settings.fx.JPY}; cargo bancario real en COP pendiente de verificar.`;
  const purchase: Purchase = {
    id: ID, name: NAME, category: "Actividades", activityId: ACTIVITY,
    city: "Tokyo", provider: "Tokyo Disney Resort · taquilla oficial",
    originalAmount: 19800, currency: "JPY", amountCOP: cop,
    date: "2026-11-04", confirmationNumber: "", status: "Pagado", notes,
    link: LINK, paymentMethodLabel: "Tarjeta terminada en 2724",
    receipt: { url: "", driveUrl: DRIVE, fileName: "DisneySea 2027-01-04 · dos entradas con QR y correo oficial", storagePath: "" },
  };
  const index = state.purchases.findIndex(p => p.id === ID || p.activityId === ACTIVITY);
  if (index < 0) state.purchases.push(purchase);
  else state.purchases[index] = { ...state.purchases[index], ...purchase };
  const activity = state.activities.find(a => a.id === ACTIVITY);
  if (activity) Object.assign(activity, {
    status: "pagada", legacyStatus: "Pagado · reserva confirmada",
    actualPaidCOP: 0, estimatedCostCOP: cop, totalForTwoCOP: cop,
    priceScope: "for_two", priceOriginal: { currency: "JPY", unit: 19800, quantity: 1 },
    priceLabel: "¥19.800 pagados para los dos · 2 × ¥9.900 · COP estimado",
    priceVerifiedAt: "2026-11-04", priceDynamic: false,
    description: DETAILS, note: notes, priceSourceUrl: LINK, bookingUrl: LINK,
  });
  const fields = {
    activityId: ACTIVITY, travelDate: "2027-01-04", name: NAME,
    currentStatus: "PAGADO · CONFIRMADO", opens: "Comprado",
    estimatedPriceCOP: cop, link: LINK, provider: purchase.provider,
    reminderNotes: notes, bookingCheckDate: undefined, bookingCheckLabel: undefined,
    bookingConfidence: undefined, bookingSourceUrl: LINK,
  };
  const reservation = state.reservations.find(r => r.activityId === ACTIVITY);
  if (reservation) Object.assign(reservation, fields);
  else state.reservations.push({ id: "res-d4-disney", ...fields });
  state.costs.filter(c => c.id === ACTIVITY || c.activityId === ACTIVITY).forEach(c => {
    Object.assign(c, { title: NAME, original: { currency: "JPY", unit: 19800, quantity: 1 },
      estimateCOP: cop, reservationStatus: "PAGADO · CONFIRMADO", reservationCode: "paid",
      opens: "Comprado", note: notes, link: LINK });
  });
  state.notes = { ...state.notes, [KEY]: notes };
  return { state, migrated: true };
}
