import type { TripState } from "../types";

export const NARITA_PAYMENT_KEY = "confirmed-narita-purchase-2026-11-25-v1";
const FOLDER = "Carpeta privada Japón 2026 en Google Drive";

/** Import the paid train and document links once; preserve subsequent bank edits. */
export function applyConfirmedNarita(input: TripState): { state: TripState; migrated: boolean } {
  if (input.notes?.[NARITA_PAYMENT_KEY]) return { state: input, migrated: false };
  const state = structuredClone(input);
  const amountCOP = Math.round(6660 * state.settings.fx.JPY);
  const detail = "25 dic 2026: Narita Airport Terminal 1 14:45 → Shinagawa 15:53. NARITA EXPRESS 30, vagón 4, asientos 14C y 14D, dos adultos. Incluye tarifa básica y asientos reservados. Reserva E09044, pagada el 25 nov 2026 con Mastercard terminada en 0116. El QR sirve para retirar los billetes físicos antes de embarcar; no da acceso directo. QR y correo guardados en Drive. No incluye el Shinkansen.";
  const note = `${detail} COP estimado con la tasa configurada (${state.settings.fx.JPY} COP/JPY); sustituir por el cargo bancario real cuando esté disponible. Documentos: ${FOLDER}`;
  const purchase = { id: "purchase-narita-E09044-2026-11-25", name: "Narita Express 30 · Terminal 1 → Shinagawa · 2 adultos", activityId: "d25-nex", category: "Transporte", city: "Narita → Tokyo", provider: "JR-EAST · Eki-net", originalAmount: 6660, currency: "JPY", amountCOP, date: "2026-11-25", confirmationNumber: "E09044", status: "Pagado" as const, paymentMethodLabel: "Tarjeta terminada en 0116", notes: note, link: "https://www.eki-net.com/en/jreast-train-reservation/Top/Index", receipt: { url: "", driveUrl: "", fileName: "Narita-Express-E09044-QR-retiro.pdf", storagePath: "" } };
  const index = state.purchases.findIndex(p => p.activityId === "d25-nex" || p.id === purchase.id);
  if (index < 0) state.purchases.push(purchase);
  else state.purchases[index] = { ...state.purchases[index], ...purchase };
  const activity = state.activities.find(a => a.id === "d25-nex");
  if (activity) Object.assign(activity, { dayId: "2026-12-25", start: "14:45", end: "15:53", durationMinutes: 68, status: "pagada", legacyStatus: "Pagado · E09044", title: purchase.name, description: detail, note, bookingLabel: "Pagado · E09044 · retirar billetes", estimatedCostCOP: amountCOP, totalForTwoCOP: amountCOP, actualPaidCOP: 0, priceScope: "for_two", priceOriginal: { currency: "JPY", unit: 6660, quantity: 1 }, priceLabel: "JPY 6.660 pagados para los dos · COP estimado", priceVerifiedAt: "2026-11-25", priceDynamic: false, bookingUrl: purchase.link });
  for (const cost of state.costs.filter(c => c.activityId === "d25-nex" || c.id === activity?.costItemId || c.id === "d25-nex")) Object.assign(cost, { title: purchase.name, original: { currency: "JPY", unit: 6660, quantity: 1 }, estimateCOP: amountCOP, reservationStatus: "PAGADO", reservationCode: "paid", opens: "Comprado", note, link: purchase.link });
  const fields = { activityId: "d25-nex", travelDate: "2026-12-25", name: purchase.name, currentStatus: "PAGADO", opens: "Comprado", estimatedPriceCOP: amountCOP, link: purchase.link, provider: purchase.provider, reminderNotes: note };
  const reservation = state.reservations.find(r => r.activityId === "d25-nex");
  if (reservation) Object.assign(reservation, fields);
  else state.reservations.push({ id: "res-paid-d25-nex", ...fields });

  const shink = state.purchases.find(p => p.activityId === "d25-shink");
  const qrNote = `Documentos guardados en Drive: QR individuales para vagón 8, asientos 17C y 17D, y correo de confirmación. Usar un QR por persona y recoger Seat Information en la puerta. Carpeta: ${FOLDER}`;
  if (shink) {
    shink.receipt = { ...shink.receipt, fileName: "Shinkansen-2003-correo-confirmacion.pdf" };
    shink.notes = shink.notes.replace("QR/billetes por obtener desde My Trips.", qrNote);
  }
  const shinkActivity = state.activities.find(a => a.id === "d25-shink");
  if (shinkActivity) for (const field of ["description", "note"] as const) shinkActivity[field] = (shinkActivity[field] || "").replace("QR/billetes por obtener desde My Trips.", qrNote);
  for (const cost of state.costs.filter(c => c.activityId === "d25-shink")) cost.note = (cost.note || "").replace("QR/billetes por obtener desde My Trips.", qrNote);
  for (const r of state.reservations.filter(r => r.activityId === "d25-shink")) r.reminderNotes = (r.reminderNotes || "").replace("QR/billetes por obtener desde My Trips.", qrNote);
  state.notes = { ...state.notes, [NARITA_PAYMENT_KEY]: `NEX E09044: JPY 6.660, tarjeta 0116. Cinco PDFs y tres QR originales guardados en Drive para NEX y Shinkansen 2003. ${FOLDER}` };
  return { state, migrated: true };
}
