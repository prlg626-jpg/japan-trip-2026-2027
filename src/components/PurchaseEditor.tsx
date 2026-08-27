import { useEffect, useState } from "react";
import type { Activity, Purchase } from "../types";
import { Modal } from "./Modal";

interface PurchaseEditorProps {
  purchase: Purchase | null;
  activities: Activity[];
  open: boolean;
  onClose: () => void;
  onSave: (purchase: Purchase) => void;
  onDelete?: (purchaseId: string) => void;
}

const categories = [
  "Vuelos internacionales",
  "Hoteles",
  "Actividades",
  "Transporte",
  "Comida",
  "Compras",
  "Colchón / otros",
];
const statuses: Purchase["status"][] = ["Idea", "Por reservar", "Reservado", "Pagado", "Cancelado"];

export function blankPurchase(activityId: string | null = null): Purchase {
  return {
    id: `purchase-${Date.now()}`,
    name: "",
    category: "Actividades",
    activityId,
    city: "General",
    provider: "",
    originalAmount: 0,
    currency: "COP",
    amountCOP: 0,
    date: new Date().toISOString().slice(0, 10),
    confirmationNumber: "",
    status: "Por reservar",
    notes: "",
    link: "",
    receipt: {
      url: "",
      driveUrl: "",
      fileName: "",
      storagePath: "",
    },
  };
}

export function PurchaseEditor({
  purchase,
  activities,
  open,
  onClose,
  onSave,
  onDelete,
}: PurchaseEditorProps) {
  const [draft, setDraft] = useState<Purchase | null>(purchase);

  useEffect(() => setDraft(purchase), [purchase]);
  if (!draft) return null;

  const update = <K extends keyof Purchase>(key: K, value: Purchase[K]) =>
    setDraft((current) => (current ? { ...current, [key]: value } : current));

  return (
    <Modal
      title="Compra / reserva"
      open={open}
      onClose={onClose}
      footer={
        <>
          {onDelete ? (
            <button className="ghost danger" type="button" onClick={() => onDelete(draft.id)}>
              Eliminar
            </button>
          ) : null}
          <button className="primaryAction" type="button" onClick={() => (onSave(draft), onClose())}>
            Guardar
          </button>
        </>
      }
    >
      <div className="formGrid">
        <label className="full">
          Nombre
          <input value={draft.name} onChange={(event) => update("name", event.target.value)} />
        </label>
        <label>
          Categoría
          <select value={draft.category} onChange={(event) => update("category", event.target.value)}>
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
        <label>
          Estado
          <select value={draft.status} onChange={(event) => update("status", event.target.value as Purchase["status"])}>
            {statuses.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
        <label>
          Actividad relacionada
          <select value={draft.activityId ?? ""} onChange={(event) => update("activityId", event.target.value || null)}>
            <option value="">Sin vínculo</option>
            {activities.map((activity) => (
              <option value={activity.id} key={activity.id}>
                {activity.start} · {activity.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Ciudad
          <input value={draft.city} onChange={(event) => update("city", event.target.value)} />
        </label>
        <label>
          Proveedor
          <input value={draft.provider} onChange={(event) => update("provider", event.target.value)} />
        </label>
        <label>
          Fecha
          <input value={draft.date} type="date" onChange={(event) => update("date", event.target.value)} />
        </label>
        <label>
          Monto original
          <input
            type="number"
            min="0"
            step="0.01"
            value={draft.originalAmount}
            onChange={(event) => update("originalAmount", Number(event.target.value) || 0)}
          />
        </label>
        <label>
          Moneda
          <select value={draft.currency} onChange={(event) => update("currency", event.target.value)}>
            <option>COP</option>
            <option>USD</option>
            <option>JPY</option>
            <option>CAD</option>
            <option>EUR</option>
          </select>
        </label>
        <label>
          Monto COP
          <input
            type="number"
            min="0"
            step="1000"
            value={draft.amountCOP}
            onChange={(event) => update("amountCOP", Number(event.target.value) || 0)}
          />
        </label>
        <label>
          Confirmación
          <input value={draft.confirmationNumber} onChange={(event) => update("confirmationNumber", event.target.value)} />
        </label>
        <label className="full">
          Link
          <input value={draft.link} onChange={(event) => update("link", event.target.value)} />
        </label>
        <label>
          URL comprobante
          <input
            value={draft.receipt.url}
            onChange={(event) => update("receipt", { ...draft.receipt, url: event.target.value })}
          />
        </label>
        <label>
          Google Drive
          <input
            value={draft.receipt.driveUrl}
            onChange={(event) => update("receipt", { ...draft.receipt, driveUrl: event.target.value })}
          />
        </label>
        <label>
          Archivo
          <input
            value={draft.receipt.fileName}
            onChange={(event) => update("receipt", { ...draft.receipt, fileName: event.target.value })}
          />
        </label>
        <label className="full">
          Notas
          <textarea value={draft.notes} rows={4} onChange={(event) => update("notes", event.target.value)} />
        </label>
      </div>
    </Modal>
  );
}
