import { useId, useState } from "react";
import type { Purchase } from "../types";
import { formatCOP } from "../utils/money";
import { purchaseComparison } from "../utils/purchaseComparison";

export function PurchaseComparison({ purchases }: { purchases: Purchase[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const detailId = useId();
  const totals = purchaseComparison(purchases);
  const cards = [
    { label: "Actividades · tarjeta 2724", value: totals.activityTotal, hint: "Pagadas", tone: "activities" },
    { label: "Hoteles + vuelos", value: totals.hotelFlightTotal, hint: "Comprados", tone: "travel" },
    { label: totals.exceeded > 0 ? "Actividades por encima" : "Falta en actividades", value: totals.exceeded || totals.remaining,
      hint: totals.exceeded > 0 ? "Del total de hoteles y vuelos" : totals.remaining === 0 ? "Total alcanzado" : "Para igualar hoteles y vuelos", tone: "difference" },
  ];
  const rows = expanded === 0 ? totals.activities : totals.hotelsAndFlights;
  return (
    <section className="purchaseComparison" aria-label="Comparativa de actividades con hoteles y vuelos">
      <div className="purchaseComparisonRow">
        {cards.map((card, index) => (
          <button key={card.tone} type="button" className={`comparisonCard ${card.tone}`}
            aria-expanded={expanded === index} aria-controls={detailId}
            onClick={() => setExpanded(expanded === index ? null : index)}>
            <span>{card.label}</span><strong>{formatCOP(card.value)}</strong><small>{card.hint}</small>
          </button>
        ))}
      </div>
      {expanded !== null ? <div className="comparisonDetails" id={detailId}>
        <strong>{cards[expanded].label}</strong>
        {expanded === 2 ? <p>{formatCOP(totals.hotelFlightTotal)} en hoteles y vuelos menos {formatCOP(totals.activityTotal)} en actividades pagadas con la 2724.
          {totals.exceeded > 0 ? ` El total de actividades ya lo supera por ${formatCOP(totals.exceeded)}.` : ""}</p> : rows.length ? <ul>
          {rows.map(p => <li key={p.id}><span>{p.name}</span><b>{formatCOP(p.amountCOP)}</b></li>)}
        </ul> : <p>No hay compras pagadas en este grupo.</p>}
        <small>Se suman los montos en COP de Compras y reservas. Las equivalencias estimadas cambian cuando registres el cargo real.</small>
      </div> : null}
    </section>
  );
}
