import type { TravelDocument } from "../types";

export function documentSummary(documents: TravelDocument[]) {
  const groups = new Map<string, TravelDocument[]>();
  documents.forEach((doc) => groups.set(doc.title, [...(groups.get(doc.title) ?? []), doc]));
  let ready = 0; let pending = 0;
  groups.forEach((docs) => {
    if (docs.every((doc) => ["Aprobado", "Completado", "No aplica"].includes(doc.status))) ready += 1;
    else pending += 1;
  });
  return { ready, pending, total: groups.size };
}

export function readinessItems(documents: TravelDocument[], hotels: Array<{ id: string; name: string; status: string; archived: boolean }>, reservations: Array<{ id: string; name: string; currentStatus: string; opens: string }>) {
  const items = [
    ...documents.filter((d) => !["Aprobado", "Completado", "No aplica"].includes(d.status)).map((d) => ({ id: `doc-${d.id}`, category: "Documentos", title: `${d.title} · ${d.travelerLabel}`, status: d.status, note: d.notes })),
    ...hotels.filter((h) => !h.archived && !/pagad|confirmad/i.test(h.status)).map((h) => ({ id: `hotel-${h.id}`, category: "Alojamiento", title: h.name, status: "Pendiente", note: h.status })),
    ...reservations.filter((r) => !/reservad|pagad|comprad/i.test(r.currentStatus)).map((r) => ({ id: `res-${r.id}`, category: "Actividades", title: r.name, status: "Pendiente", note: r.opens ? `Abre: ${r.opens}` : r.currentStatus })),
  ];
  return items;
}
