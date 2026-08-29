import { useEffect, useMemo, useState } from "react";
import type { Activity, SourceLink, TripDay, Zone } from "../types";
import { Modal } from "./Modal";

interface ActivityEditorProps {
  activity: Activity | null;
  days: TripDay[];
  sources: SourceLink[];
  zones?: Zone[];
  open: boolean;
  onClose: () => void;
  onSave: (activity: Activity, source?: SourceLink) => void;
  onDelete?: (activityId: string) => void;
}

const statuses: Activity["status"][] = [
  "idea",
  "pendiente_de_reservar",
  "reservada",
  "pagada",
  "completada",
];

export function ActivityEditor({
  activity,
  days,
  sources,
  zones = [],
  open,
  onClose,
  onSave,
  onDelete,
}: ActivityEditorProps) {
  const [draft, setDraft] = useState<Activity | null>(activity);
  const firstSource = useMemo(
    () => sources.find((source) => activity?.sourceIds.includes(source.id)),
    [activity, sources],
  );
  const [sourceUrl, setSourceUrl] = useState(firstSource?.url ?? "");
  const [sourceHandle, setSourceHandle] = useState(firstSource?.handle ?? "");

  useEffect(() => {
    setDraft(activity);
    const src = sources.find((source) => activity?.sourceIds.includes(source.id));
    setSourceUrl(src?.url ?? "");
    setSourceHandle(src?.handle ?? "");
  }, [activity, sources]);

  if (!draft) return null;

  const update = <K extends keyof Activity>(key: K, value: Activity[K]) =>
    setDraft((current) => (current ? { ...current, [key]: value } : current));

  const save = () => {
    let nextSource: SourceLink | undefined;
    let nextActivity = draft;
    if (sourceUrl.trim()) {
      const existing = sources.find((source) => source.url === sourceUrl.trim());
      nextSource =
        existing ??
        ({
          id: `src-${Date.now()}`,
          type: sourceUrl.includes("instagram") ? "Instagram Reel" : "TikTok/Reel",
          handle: sourceHandle.trim(),
          url: sourceUrl.trim(),
          note: "",
          used: [draft.title],
          associatedActivityIds: [draft.id],
        } satisfies SourceLink);
      nextSource = {
        ...nextSource,
        handle: sourceHandle.trim() || nextSource.handle,
        associatedActivityIds: Array.from(new Set([...nextSource.associatedActivityIds, draft.id])),
      };
      nextActivity = {
        ...draft,
        sourceIds: Array.from(new Set([...draft.sourceIds, nextSource.id])),
      };
    }
    onSave(nextActivity, nextSource);
    onClose();
  };

  return (
    <Modal
      title={draft.id.startsWith("act-") ? "Añadir actividad" : "Editar actividad"}
      open={open}
      onClose={onClose}
      footer={
        <>
          {onDelete ? (
            <button className="ghost danger" type="button" onClick={() => onDelete(draft.id)}>
              Eliminar
            </button>
          ) : null}
          <button className="primaryAction" type="button" onClick={save}>
            Guardar
          </button>
        </>
      }
    >
      <div className="formGrid">
        <label className="full">
          Actividad
          <input value={draft.title} onChange={(event) => update("title", event.target.value)} />
        </label>
        <label>
          Día
          <select value={draft.dayId} onChange={(event) => update("dayId", event.target.value)}>
            {days.map((day) => (
              <option value={day.id} key={day.id}>
                {day.label} · {day.city}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipo
          <input value={draft.kind} onChange={(event) => update("kind", event.target.value)} />
        </label>
        <label>
          Inicio
          <input value={draft.start} type="time" onChange={(event) => update("start", event.target.value)} />
        </label>
        <label>
          Fin
          <input value={draft.end} type="time" onChange={(event) => update("end", event.target.value)} />
        </label>
        <label className="full">
          Lugar
          <input value={draft.place} onChange={(event) => update("place", event.target.value)} />
        </label>
        <label className="full">
          Descripción · ¿qué es?
          <textarea value={draft.description} rows={3} onChange={(event) => update("description", event.target.value)} />
        </label>
        <label>
          Zona
          <select value={draft.zoneId ?? ""} onChange={(event) => update("zoneId", event.target.value || null)}>
            <option value="">Sin zona</option>
            {zones.map((zone) => <option value={zone.id} key={zone.id}>{zone.name}</option>)}
          </select>
        </label>
        <label>
          Presentación
          <select value={draft.displayMode} onChange={(event) => update("displayMode", event.target.value as Activity["displayMode"])}>
            <option value="anchor">Ancla con hora</option><option value="flex-list">Lista flexible</option><option value="transport">Transporte</option><option value="hotel">Hotel</option><option value="timed">Con hora</option>
          </select>
        </label>
        <label>
          Categoría
          <select value={draft.category} onChange={(event) => update("category", event.target.value)}>
            <option value="experience">Experiencia</option><option value="transport">Transporte</option><option value="food">Comida / café</option><option value="explore">Explorar</option><option value="shopping">Compras</option><option value="museum">Museo</option><option value="nature">Naturaleza</option><option value="anime">Anime / gaming</option>
          </select>
        </label>
        <label>
          Ranking
          <select value={draft.priorityRank} onChange={(event) => update("priorityRank", event.target.value as Activity["priorityRank"])}>
            <option value="essential">Imprescindible</option><option value="recommended">Recomendado</option><option value="nearby">Si queda cerca</option><option value="niche">Nicho</option>
          </select>
        </label>
        <label>
          Latitud
          <input
            value={draft.lat ?? ""}
            type="number"
            step="0.000001"
            onChange={(event) => update("lat", event.target.value === "" ? null : Number(event.target.value))}
          />
        </label>
        <label>
          Longitud
          <input
            value={draft.lon ?? ""}
            type="number"
            step="0.000001"
            onChange={(event) => update("lon", event.target.value === "" ? null : Number(event.target.value))}
          />
        </label>
        <label>
          Estado
          <select value={draft.status} onChange={(event) => update("status", event.target.value as Activity["status"])}>
            {statuses.map((status) => (
              <option value={status} key={status}>
                {status.split("_").join(" ")}
              </option>
            ))}
          </select>
        </label>
        <label>
          Alcance del precio
          <select value={draft.priceScope} onChange={(event) => update("priceScope", event.target.value as Activity["priceScope"])}>
            <option value="per_person">Por persona</option><option value="for_two">Total para dos</option><option value="per_item">Por producto</option><option value="free">Gratis</option><option value="variable">Variable</option><option value="included">Incluido</option><option value="unknown">Por verificar</option>
          </select>
        </label>
        <label>
          Precio explicado
          <input value={draft.priceLabel} onChange={(event) => update("priceLabel", event.target.value)} />
        </label>
        <label>
          ¿Requiere reserva?
          <select value={draft.reservationRequired ? "yes":"no"} onChange={(event) => update("reservationRequired", event.target.value === "yes")}><option value="no">No</option><option value="yes">Sí</option></select>
        </label>
        <label>
          Cierre / festivo
          <input value={draft.holidayNote} onChange={(event) => update("holidayNote", event.target.value)} />
        </label>
        <label>
          Precio estimado COP
          <input
            type="number"
            min="0"
            step="1000"
            value={draft.estimatedCostCOP ?? 0}
            onChange={(event) => update("estimatedCostCOP", Number(event.target.value) || 0)}
          />
        </label>
        <label>
          Pagado real COP
          <input
            type="number"
            min="0"
            step="1000"
            value={draft.actualPaidCOP ?? 0}
            onChange={(event) => update("actualPaidCOP", Number(event.target.value) || 0)}
          />
        </label>
        <label>
          Activa
          <select value={draft.included ? "yes" : "no"} onChange={(event) => update("included", event.target.value === "yes")}>
            <option value="yes">Sí</option>
            <option value="no">No</option>
          </select>
        </label>
        <label className="full">
          Reserva / sitio oficial
          <input value={draft.bookingUrl} onChange={(event) => update("bookingUrl", event.target.value)} />
        </label>
        <label>
          Usuario fuente
          <input value={sourceHandle} onChange={(event) => setSourceHandle(event.target.value)} />
        </label>
        <label>
          TikTok/Reel
          <input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} />
        </label>
        <label className="full">
          Notas
          <textarea value={draft.note} rows={4} onChange={(event) => update("note", event.target.value)} />
        </label>
      </div>
    </Modal>
  );
}
