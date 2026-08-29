import { useEffect, useState } from "react";
import type { Hotel } from "../types";
import { Modal } from "./Modal";

interface HotelEditorProps {
  hotel: Hotel | null;
  open: boolean;
  onClose: () => void;
  onSave: (hotel: Hotel) => void;
}

export function HotelEditor({ hotel, open, onClose, onSave }: HotelEditorProps) {
  const [draft, setDraft] = useState<Hotel | null>(hotel);
  useEffect(() => setDraft(hotel), [hotel]);
  if (!draft) return null;

  const update = <K extends keyof Hotel>(key: K, value: Hotel[K]) =>
    setDraft((current) => (current ? { ...current, [key]: value } : current));

  return (
    <Modal
      title={`Hotel · ${draft.city}`}
      open={open}
      onClose={onClose}
      footer={<button className="primaryAction" type="button" onClick={() => (onSave(draft), onClose())}>Guardar</button>}
    >
      <div className="formGrid">
        <label className="full">
          Hotel
          <input value={draft.name} onChange={(event) => update("name", event.target.value)} />
        </label>
        <label>
          Precio
          <input
            type="number"
            min="0"
            step="0.01"
            value={draft.price.amount}
            onChange={(event) => update("price", { ...draft.price, amount: Number(event.target.value) || 0 })}
          />
        </label>
        <label>
          Moneda
          <select
            value={draft.price.currency}
            onChange={(event) => update("price", { ...draft.price, currency: event.target.value })}
          >
            <option>COP</option>
            <option>USD</option>
            <option>JPY</option>
          </select>
        </label>
        <label>
          Noches
          <input type="number" min="0" value={draft.nights} onChange={(event) => update("nights", Number(event.target.value) || 0)} />
        </label>
        <label>
          Noches cotizadas
          <input type="number" min="0" value={draft.quotedNights} onChange={(event) => update("quotedNights", Number(event.target.value) || 0)} />
        </label>
        <label>
          Noches planificadas
          <input type="number" min="0" value={draft.plannedNights} onChange={(event) => update("plannedNights", Number(event.target.value) || 0)} />
        </label>
        <label>
          Cobertura cotización
          <select value={draft.quoteCoverage} onChange={(event) => update("quoteCoverage", event.target.value as Hotel["quoteCoverage"])}><option value="full">Completa</option><option value="partial">Parcial</option><option value="none">Ninguna</option></select>
        </label>
        <label className="full">
          Alerta de cotización
          <input value={draft.quoteWarning} onChange={(event) => update("quoteWarning", event.target.value)} />
        </label>
        <label>
          Estado
          <input value={draft.status} onChange={(event) => update("status", event.target.value)} />
        </label>
        <label className="full">
          Link oficial
          <input value={draft.link} onChange={(event) => update("link", event.target.value)} />
        </label>
        <label className="full">
          Klook · fotos y habitaciones
          <input value={draft.klookUrl ?? ""} onChange={(event) => update("klookUrl", event.target.value)} />
        </label>
        <label className="full">
          Reserva
          <input value={draft.reservation} onChange={(event) => update("reservation", event.target.value)} />
        </label>
        <label className="full">
          Dirección
          <input value={draft.address} onChange={(event) => update("address", event.target.value)} />
        </label>
        <label>
          Latitud
          <input
            type="number"
            step="0.000001"
            value={draft.lat ?? ""}
            onChange={(event) => update("lat", event.target.value === "" ? null : Number(event.target.value))}
          />
        </label>
        <label>
          Longitud
          <input
            type="number"
            step="0.000001"
            value={draft.lon ?? ""}
            onChange={(event) => update("lon", event.target.value === "" ? null : Number(event.target.value))}
          />
        </label>
        <label>Check-in<input value={draft.checkIn} onChange={(event) => update("checkIn", event.target.value)} /></label>
        <label>Check-out<input value={draft.checkOut} onChange={(event) => update("checkOut", event.target.value)} /></label>
        <label>Plan de comida<input value={draft.mealPlan} onChange={(event) => update("mealPlan", event.target.value)} /></label>
        <label>Archivado<select value={draft.archived?"yes":"no"} onChange={(event)=>update("archived",event.target.value==="yes")}><option value="no">No</option><option value="yes">Sí</option></select></label>
        <label className="full">
          Notas
          <textarea value={draft.notes} rows={4} onChange={(event) => update("notes", event.target.value)} />
        </label>
      </div>
    </Modal>
  );
}
