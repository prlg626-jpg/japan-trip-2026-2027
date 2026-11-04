import type { Purchase } from "../types";

export function purchaseCardLastFour(purchase: Purchase): string | null {
  // An explicitly edited payment method takes precedence over older notes.
  const method = purchase.paymentMethodLabel?.trim();
  if (method) return method.match(/(?:^|\D)(\d{4})\s*$/)?.[1] ?? null;
  return `${purchase.name} ${purchase.notes}`.match(/tarjeta\s*(?:terminada\s+en\s*)?(\d{4})(?!\d)/i)?.[1] ?? null;
}

export function purchaseComparison(purchases: Purchase[]) {
  const paid = purchases.filter(p => p.status === "Pagado" && p.id !== "summary-selected-activities");
  const activities = paid.filter(p => p.category.trim().toLowerCase() === "actividades" && purchaseCardLastFour(p) === "2724");
  const hotelsAndFlights = paid.filter(p => /^(hoteles|vuelos internacionales)$/i.test(p.category.trim()));
  const sum = (rows: Purchase[]) => rows.reduce((total, p) => total + (Number(p.amountCOP) || 0), 0);
  const activityTotal = sum(activities);
  const hotelFlightTotal = sum(hotelsAndFlights);
  return { activities, hotelsAndFlights, activityTotal, hotelFlightTotal,
    remaining: Math.max(0, hotelFlightTotal - activityTotal),
    exceeded: Math.max(0, activityTotal - hotelFlightTotal) };
}
