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
  if (activity.estimatedCostCOP != null && Number(activity.estimatedCostCOP) > 0) return Number(activity.estimatedCostCOP);
  const legacyCostAliases: Record<string, string> = {
    "v7-28-chopsticks": "d26-chopsticks",
    "v7-28-matcha": "d26-matcha",
    "v7-8-brother": "d8-brother",
    "v7-5-perfume": "d5-perfume",
    "v7-6-jins": "d3-jins",
  };
  const costId = activity.costItemId || legacyCostAliases[activity.id];
  const cost = costId ? state.costs.find((item) => item.id === costId) : null;
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

function isActivityBudgetItem(activity: Activity): boolean {
  const category = (activity.category || "").toLowerCase();
  const kind = (activity.kind || "").toLowerCase();
  if (["transport", "flight", "food", "restaurant", "shopping", "hotel", "rest"].includes(category)) return false;
  if (["transport", "flight", "food", "restaurant", "shopping", "hotel", "rest"].includes(kind)) return false;
  return true;
}

export function selectedActivityBudget(state: TripState) {
  const selected = state.activities.filter((activity) => activity.included && isActivityBudgetItem(activity));
  const purchasedActivityIds = new Set(
    state.purchases
      .filter((purchase) => purchase.status === "Pagado" || purchase.status === "Reservado")
      .map((purchase) => purchase.activityId)
      .filter(Boolean),
  );

  const rows = selected
    .map((activity) => ({
      activity,
      estimate: activityEstimate(activity, state),
      coveredByPurchase: purchasedActivityIds.has(activity.id),
    }))
    .filter((row) => row.estimate > 0);

  return {
    selectedCount: selected.length,
    pricedCount: rows.length,
    estimatedTotal: rows.reduce((sum, row) => sum + row.estimate, 0),
    pendingTotal: rows.filter((row) => !row.coveredByPurchase).reduce((sum, row) => sum + row.estimate, 0),
    rows,
  };
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
    .filter((activity) => activity.included && isActivityBudgetItem(activity))
    .filter((activity) => !purchasedActivityIds.has(activity.id))
    .reduce((sum, activity) => sum + activityEstimate(activity, state), 0);

  const committedHotelCities = new Set(
    state.purchases
      .filter((purchase) => purchase.category === "Hoteles" && (purchase.status === "Pagado" || purchase.status === "Reservado"))
      .map((purchase) => purchase.city),
  );

  const pendingHotels = state.hotels
    .filter((hotel) => !hotel.archived && !hotel.paid && !committedHotelCities.has(hotel.city))
    .reduce((sum, hotel) => sum + hotelExpectedCOP(hotel, state), 0);

  const pending = pendingActivities + pendingHotels;
  const activities = selectedActivityBudget(state);

  return {
    totalBudget,
    paid,
    committed,
    pending,
    pendingActivities,
    pendingHotels,
    activities,
    availableToday: totalBudget - paid,
    afterPlanned: totalBudget - paid - committed - pending,
  };
}
