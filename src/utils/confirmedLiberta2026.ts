import type { TripState } from "../types";

const KEY = "confirmed-liberta-reservation-2026-11-24-v1";

/** Record the accepted appointment once, preserving later user changes. */
export function applyConfirmedLibertaReservation(input: TripState): TripState {
  if (input.notes?.[KEY]) return input;
  const state = structuredClone(input);
  const note = "Reserva completada en la web oficial el 24 nov 2026: 5 ene 2027, 11:00 JST, Standard para 2. Preferencias individuales enviadas al perfumista. Sin pago realizado al reservar; referencia desde ¥34.000 ambos más ingredientes opcionales. Conservar margen hasta las 13:00 para consulta y preparación.";
  const activity = state.activities.find(a => a.id === "v7-5-perfume");
  if (!activity) return input;
  Object.assign(activity, { dayId: "2027-01-05", start: "11:00", end: "13:00", status: "reservada", legacyStatus: "Reservada", bookingLabel: "Reservada · 5 ene 11:00 · 2 personas", holidayNote: "Cita confirmada para el 5 ene.", description: "Crear un perfume corporal individual para cada uno en LIBERTA Nakameguro. " + note, note });
  for (const reservation of state.reservations.filter(r => ["v7-5-perfume", "d5-perfume"].includes(r.activityId ?? "") || r.id === "res-d5-perfume")) {
    Object.assign(reservation, { travelDate: "2027-01-05", currentStatus: "RESERVADO", opens: "Reservada · 5 ene 11:00 JST", reminderNotes: note });
  }
  for (const cost of state.costs.filter(c => c.activityId === activity.id || c.id === "d5-perfume")) {
    cost.reservationStatus = "RESERVADO";
    cost.note = note;
  }
  state.notes = { ...state.notes, [KEY]: note };
  return state;
}
