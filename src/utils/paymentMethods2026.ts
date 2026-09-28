import type { TripState } from "../types";

const PAYMENT_METHODS: Record<string, string> = {
  "p-vuelos-internacionales-confirmados": "Tarjeta terminada en 0116",
  "purchase-hotel-osaka-monterey": "Tarjeta terminada en 0116",
  "purchase-hotel-tokyo-tokyustay": "Tarjeta terminada en 0116",
  "purchase-klook-tea-osaka-2026-09-27": "Tarjeta terminada en 2724",
  "purchase-klook-chopsticks-osaka-2026-09-27": "Tarjeta terminada en 2724",
  "purchase-klook-daruma-jeans-2026-09-27": "Tarjeta terminada en 2724",
};

export function applyPaymentMethodRegister(input: TripState): TripState {
  const state = structuredClone(input);
  state.purchases.forEach((purchase) => {
    const label = PAYMENT_METHODS[purchase.id];
    if (label) purchase.paymentMethodLabel = label;
  });
  return state;
}
