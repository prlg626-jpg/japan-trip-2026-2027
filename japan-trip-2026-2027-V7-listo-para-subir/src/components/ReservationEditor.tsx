import { useEffect, useState } from "react";
import type { Reservation } from "../types";
import { Modal } from "./Modal";

interface ReservationEditorProps {
  reservation: Reservation | null;
  open: boolean;
  onClose: () => void;
  onSave: (reservation: Reservation) => void;
}

export function ReservationEditor({ reservation, open, onClose, onSave }: ReservationEditorProps) {
  const [draft, setDraft] = useState<Reservation | null>(reservation);
  useEffect(() => setDraft(reservation), [reservation]);
  if (!draft) return null;

  const update = <K extends keyof Reservation>(key: K, value: Reservation[K]) =>
    setDraft((current) => (current ? { ...current, [key]: value } : current));

  return (
    <Modal
      title="Reserva"
      open={open}
      onClose={onClose}
      footer={<button className="primaryAction" type="button" onClick={() => (onSave(draft), onClose())}>Guardar</button>}
    >
      <div className="formGrid">
        <label className="full">
          Nombre
          <input value={draft.name} onChange={(event) => update("name", event.target.value)} />
        </label>
        <label>
          Fecha del viaje
          <input value={draft.travelDate} onChange={(event) => update("travelDate", event.target.value)} />
        </label>
        <label>
          Estado actual
          <input value={draft.currentStatus} onChange={(event) => update("currentStatus", event.target.value)} />
        </label>
        <label>
          Abre venta
          <input value={draft.opens} onChange={(event) => update("opens", event.target.value)} />
        </label>
        <label>
          Precio estimado COP
          <input
            type="number"
            min="0"
            step="1000"
            value={draft.estimatedPriceCOP}
            onChange={(event) => update("estimatedPriceCOP", Number(event.target.value) || 0)}
          />
        </label>
        <label>
          Proveedor
          <input value={draft.provider} onChange={(event) => update("provider", event.target.value)} />
        </label>
        <label className="full">
          Link
          <input value={draft.link} onChange={(event) => update("link", event.target.value)} />
        </label>
        <label className="full">
          Recordatorio / notas
          <textarea value={draft.reminderNotes} rows={4} onChange={(event) => update("reminderNotes", event.target.value)} />
        </label>
      </div>
    </Modal>
  );
}
