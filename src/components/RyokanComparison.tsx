import { ExternalLink, Waves } from "lucide-react";
import type { RyokanCandidate } from "../types";
export function RyokanComparison({ candidates }: { candidates: RyokanCandidate[] }) {
  if (!candidates.length) return null;
  return <section className="ryokanComparison"><header><div><span>Hakone · ryokan</span><h3>Comparador recomendado</h3><p>El presupuesto de Año Nuevo puede quedar corto; no se asume que ninguna opción cabe hasta cotizar el 1 de enero.</p></div><span className="warningInline">⚠ Riesgo presupuestario</span></header><div className="ryokanGrid">{[...candidates].sort((a,b)=>a.rank-b.rank).map(r=><article key={r.id}><span className="rankBadge">#{r.rank}</span><Waves size={20}/><h4>{r.name}</h4><p>{r.why}</p><small>Onsen privado en habitación: {r.privateOnsenRoom}</small><small>Check-in {r.checkIn} · check-out {r.checkOut}</small><a className="chipButton" href={r.officialUrl} target="_blank" rel="noreferrer"><ExternalLink size={14}/>Ver ryokan</a></article>)}</div></section>;
}
