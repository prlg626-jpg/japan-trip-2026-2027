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
          Estado
          <input value={draft.status} onChange={(event) => update("status", event.target.value)} />
        </label>
        <label className="full">
          Link
          <input value={draft.link} onChange={(event) => update("link", event.target.value)} />
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
        <label className="full">
          Notas
          <textarea value={draft.notes} rows={4} onChange={(event) => update("notes", event.target.value)} />
        </label>
      </div>
    </Modal>
  );
}
