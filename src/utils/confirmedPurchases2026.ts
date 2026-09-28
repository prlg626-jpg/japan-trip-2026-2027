import type { Purchase, TripState } from "../types";

const PURCHASE_MIGRATION_KEY = "confirmed-klook-purchases-2026-09-27-v1";
const PURCHASE_DATE = "2026-09-27";
const USD_COP_AT_PURCHASE = 3347.13;

type ConfirmedPurchase = {
  activityId: string;
  purchaseId: string;
  name: string;
  city: string;
  usd: number;
  time: string;
  provider: string;
  link: string;
  note: string;
};

const CONFIRMED: ConfirmedPurchase[] = [
  {
    activityId: "v7-28-matcha",
    purchaseId: "purchase-klook-tea-osaka-2026-09-27",
    name: "Tea Ceremony Experience in Osaka · 45-Minute Tea Ceremony Experience",
    city: "Osaka",
    usd: 46.38,
    time: "28 dic 2026 · 16:00 · 2 adultos",
    provider: "Klook",
    link:
      "https://www.klook.com/en-US/activity/95687-join-tea-ceremony-experience-osaka/",
    note: "Booking confirmed · Total paid US$46.38.",
  },
  {
    activityId: "v7-28-chopsticks",
    purchaseId: "purchase-klook-chopsticks-osaka-2026-09-27",
    name: "Chopstick Making Class in Osaka · Chopstick Making",
    city: "Osaka",
    usd: 19.10,
    time: "28 dic 2026 · 14:00 · 2 adultos",
    provider: "Klook",
    link:
      "https://www.klook.com/en-US/activity/203646-osaka-chopstick-making-workshop-with-local-instructor/",
    note: "Booking confirmed · Total paid US$19.10.",
  },
  {
    activityId: "d7-jeans",
    purchaseId: "purchase-klook-daruma-jeans-2026-09-27",
    name: "Daruma Jeans · Denim Jeans Making Workshop in Tokyo",
    city: "Tokyo",
    usd: 268.60,
    time: "7 ene 2027 · 11:00 · 2 adultos",
    provider: "Klook · Daruma Jeans",
    link:
      "https://www.klook.com/en-US/activity/194175-tokyo-denim-jeans-making-workshop/",
    note: "Booking confirmed · Total paid US$268.60.",
  },
];

function paidCop(usd: number) {
  return Math.round(usd * USD_COP_AT_PURCHASE);
}

function upsertPurchase(state: TripState, item: ConfirmedPurchase) {
  const purchase: Purchase = {
    id: item.purchaseId,
    name: item.name,
    category: "Actividades",
    activityId: item.activityId,
    city: item.city,
    provider: item.provider,
    originalAmount: item.usd,
    currency: "USD",
    amountCOP: paidCop(item.usd),
    date: PURCHASE_DATE,
    confirmationNumber: "",
    status: "Pagado",
    notes:
      `${item.note} ${item.time}. COP estimado con USD/COP ${USD_COP_AT_PURCHASE}; reemplazar por el cargo real de la tarjeta si se registra después.`,
    link: item.link,
    receipt: { url: "", driveUrl: "", fileName: "", storagePath: "" },
  };

  const index = state.purchases.findIndex(
    (existing) =>
      existing.id === item.purchaseId || existing.activityId === item.activityId,
  );
  if (index >= 0) state.purchases[index] = { ...state.purchases[index], ...purchase };
  else state.purchases.push(purchase);
}

export function applyConfirmedKlookPurchasesV1(input: TripState): {
  state: TripState;
  migrated: boolean;
} {
  if (input.notes?.[PURCHASE_MIGRATION_KEY]) {
    return { state: input, migrated: false };
  }

  const state = structuredClone(input);

  for (const item of CONFIRMED) {
    const amountCOP = paidCop(item.usd);
    const activity = state.activities.find((entry) => entry.id === item.activityId);
    if (activity) {
      activity.status = "pagada";
      activity.legacyStatus = "Pagado · reserva confirmada";
      activity.actualPaidCOP = amountCOP;
      activity.estimatedCostCOP = amountCOP;
      activity.totalForTwoCOP = amountCOP;
      activity.priceScope = "for_two";
      activity.priceOriginal = { currency: "USD", unit: item.usd, quantity: 1 };
      activity.priceLabel = `US$${item.usd.toFixed(2)} pagados para los dos · ≈ $${amountCOP.toLocaleString("es-CO")} COP`;
      activity.priceVerifiedAt = PURCHASE_DATE;
      activity.priceSourceUrl = item.link;
      activity.bookingUrl = item.link;
    }

    const reservation = state.reservations.find((entry) => {
      if (entry.activityId === item.activityId) return true;
      if (item.activityId === "v7-28-matcha" && entry.activityId === "d26-matcha") return true;
      if (item.activityId === "v7-28-chopsticks" && entry.activityId === "d26-chopsticks") return true;
      return false;
    });
    if (reservation) {
      reservation.activityId = item.activityId;
      reservation.name = item.name;
      reservation.currentStatus = "PAGADO · BOOKING CONFIRMED";
      reservation.opens = "Comprado";
      reservation.estimatedPriceCOP = amountCOP;
      reservation.link = item.link;
      reservation.provider = item.provider;
      reservation.reminderNotes = `${item.note} ${item.time}`;
      reservation.bookingCheckDate = undefined;
      reservation.bookingCheckLabel = undefined;
      reservation.bookingConfidence = undefined;
      reservation.bookingSourceUrl = item.link;
    }

    const costIds =
      item.activityId === "v7-28-matcha"
        ? ["d26-matcha", item.activityId]
        : item.activityId === "v7-28-chopsticks"
          ? ["d26-chopsticks", item.activityId]
          : [item.activityId];
    const cost = state.costs.find(
      (entry) => costIds.includes(entry.id) || costIds.includes(entry.activityId ?? ""),
    );
    if (cost) {
      cost.activityId = item.activityId;
      cost.title = item.name;
      cost.original = { currency: "USD", unit: item.usd, quantity: 1 };
      cost.estimateCOP = amountCOP;
      cost.reservationStatus = "PAGADO · CONFIRMADO";
      cost.reservationCode = "paid";
      cost.opens = "Comprado";
      cost.note = `${item.note} ${item.time}`;
      cost.link = item.link;
    }

    upsertPurchase(state, item);
  }

  state.notes = state.notes ?? {};
  state.notes[PURCHASE_MIGRATION_KEY] =
    "Klook confirmadas: Tea Ceremony US$46.38, Chopsticks US$19.10, Daruma Jeans US$268.60. Marcadas Pagado y retiradas de pendientes.";

  return { state, migrated: true };
}
