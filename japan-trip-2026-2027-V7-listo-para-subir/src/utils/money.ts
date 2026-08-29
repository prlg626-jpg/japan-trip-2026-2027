import type { Activity, CostItem, Hotel, Purchase, TripState } from "../types";

export function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Math.round(Number(value) || 0));
}

export function formatMoney(value: number, currency: string): string {
  if (currency === "COP") return formatCOP(value);
  const prefix = currency === "USD" ? "US$" : currency === "JPY" ? "¥" : `${currency} `;
  return `${prefix}${new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(Number(value) || 0)}`;
}

export function estimateFromOriginal(cost: CostItem, state: TripState): number {
  const amount = Number(cost.original.unit || 0) * Number(cost.original.quantity || 1);
  if (cost.original.currency === "COP") return amount;
  if (cost.original.currency === "USD") return amount * Number(state.settings.fx.USD || 0);
  if (cost.original.currency === "JPY") return amount * Number(state.settings.fx.JPY || 0);
  return Number(cost.estimateCOP || 0);
}

export function activityEstimate(activity: Activity, state: TripState): number {
  if (activity.estimatedCostCOP != null) return Number(activity.estimatedCostCOP || 0);
  const cost = activity.costItemId ? state.costs.find((item) => item.id === activity.costItemId) : null;
  return cost ? estimateFromOriginal(cost, state) : 0;
}

export function hotelExpectedCOP(hotel: Hotel, state: TripState): number {
  if (hotel.price.currency === "COP") return Number(hotel.price.amount || hotel.budgetCOP || 0);
  if (hotel.price.currency === "USD") return Number(hotel.price.amount || 0) * Number(state.settings.fx.USD || 0);
  if (hotel.price.currency === "JPY") return Number(hotel.price.amount || 0) * Number(state.settings.fx.JPY || 0);
  return Number(hotel.price.amountCOP || hotel.budgetCOP || 0);
}

export function purchasePaid(purchase: Purchase): boolean {
  return purchase.status === "Pagado";
}

export function purchaseCommitted(purchase: Purchase): boolean {
  return purchase.status === "Reservado";
}

export function calculateBudget(state: TripState) {
  const totalBudget = state.budget.categories.reduce((sum, category) => sum + Number(category.limitCOP || 0), 0);
  const paidPurchases = state.purchases.filter(purchasePaid).reduce((sum, purchase) => sum + Number(purchase.amountCOP || 0), 0);
  const paidActivities = state.activities
    .filter((activity) => activity.actualPaidCOP > 0 && !state.purchases.some((purchase) => purchase.activityId === activity.id))
    .reduce((sum, activity) => sum + Number(activity.actualPaidCOP || 0), 0);
  const paid = paidPurchases + paidActivities;
  const committed = state.purchases
    .filter(purchaseCommitted)
    .reduce((sum, purchase) => sum + Number(purchase.amountCOP || 0), 0);
  const purchasedActivityIds = new Set(
    state.purchases
      .filter((purchase) => purchase.status === "Pagado" || purchase.status === "Reservado")
      .map((purchase) => purchase.activityId)
      .filter(Boolean),
  );
  const pendingActivities = state.activities
    .filter((activity) => activity.included)
    .filter((activity) => !purchasedActivityIds.has(activity.id))
    .reduce((sum, activity) => sum + activityEstimate(activity, state), 0);
  const paidHotelCities = new Set(
    state.purchases
      .filter((purchase) => purchase.category === "Hoteles" && purchase.status === "Pagado")
      .map((purchase) => purchase.city),
  );
  const pendingHotels = state.hotels
    .filter((hotel) => !hotel.paid && !paidHotelCities.has(hotel.city))
    .reduce((sum, hotel) => sum + hotelExpectedCOP(hotel, state), 0);
  const pending = pendingActivities + pendingHotels;
  return {
    totalBudget,
    paid,
    committed,
    pending,
    availableToday: totalBudget - paid,
    afterPlanned: totalBudget - paid - committed - pending,
  };
}
