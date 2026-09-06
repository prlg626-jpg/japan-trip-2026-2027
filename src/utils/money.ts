import type { Activity, CostItem, Hotel, Purchase, TripState } from "../types";

const FIXED_TRIP_BUDGET_COP = 36_000_000;

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

export function syncMoneyPage(state: TripState): TripState {
  const copy = structuredClone(state);
  const summaryId = "summary-selected-activities";
  copy.purchases = copy.purchases.filter((purchase) => purchase.id !== summaryId);

  const activities = selectedActivityBudget(copy);

  // The activity line is not a discretionary ceiling anymore: it mirrors the
  // actual priced activities that are currently active in the itinerary.
  copy.budget.categories = copy.budget.categories.map((category) => {
    const isActivities = category.id.toLowerCase().includes("activ") || category.name.toLowerCase().includes("activ");
    return isActivities
      ? { ...category, name: "Actividades seleccionadas (calculado)", limitCOP: Math.round(activities.estimatedTotal) }
      : category;
  });

  const datedRows = activities.rows
    .sort((a, b) => a.activity.dayId.localeCompare(b.activity.dayId) || a.activity.order - b.activity.order);
  const preview = datedRows.slice(0, 8).map((row) => row.activity.title).join(" · ");
  const extra = Math.max(0, datedRows.length - 8);

  copy.purchases.push({
    id: summaryId,
    name: `Actividades seleccionadas · ${activities.pricedCount} con precio`,
    category: "Actividades",
    activityId: null,
    city: "Japón",
    provider: "Calculado desde el itinerario activo",
    originalAmount: activities.estimatedTotal,
    currency: "COP",
    amountCOP: activities.estimatedTotal,
    date: "Plan actual",
    confirmationNumber: "",
    status: "Por reservar",
    notes: `${activities.selectedCount} actividades activas en los días; ${activities.pricedCount} tienen precio cargado. Falta por reservar/pagar de esas actividades: ${formatCOP(activities.pendingTotal)}. ${preview}${extra ? ` · +${extra} más` : ""}`,
    link: "",
    receipt: { url: "", driveUrl: "", fileName: "", storagePath: "" },
  });

  return copy;
}

export function calculateBudget(state: TripState) {
  // User-approved closed ceiling for the whole trip. Category allocations no
  // longer redefine the trip total when one line is edited or recalculated.
  const totalBudget = FIXED_TRIP_BUDGET_COP;

  const paidPurchases = state.purchases
    .filter((purchase) => purchase.id !== "summary-selected-activities")
    .filter(purchasePaid)
    .reduce((sum, purchase) => sum + Number(purchase.amountCOP || 0), 0);
  const paidActivities = state.activities
    .filter((activity) => activity.actualPaidCOP > 0 && !state.purchases.some((purchase) => purchase.activityId === activity.id))
    .reduce((sum, activity) => sum + Number(activity.actualPaidCOP || 0), 0);
  const paid = paidPurchases + paidActivities;

  const committed = state.purchases
    .filter((purchase) => purchase.id !== "summary-selected-activities")
    .filter(purchaseCommitted)
    .reduce((sum, purchase) => sum + Number(purchase.amountCOP || 0), 0);

  const purchasedActivityIds = new Set(
    state.purchases
      .filter((purchase) => purchase.id !== "summary-selected-activities")
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

  // "Pending" means things already present in the live plan but not yet
  // reserved/paid: active priced activities + unpaid/unreserved hotel(s), e.g. Hakone.
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
