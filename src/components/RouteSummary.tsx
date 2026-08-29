import { ExternalLink, Footprints, TrainFront } from "lucide-react";
import type { RouteSegment } from "../types";
import "../v8.css";

const JPY_COP=19.3465;
function copFromJPY(value:number){return new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(Math.round(value*JPY_COP));}
function modeLabel(mode:RouteSegment["mode"]){return({walk:"A pie",metro:"Metro/JR",jr:"JR",bus:"Bus",shuttle:"Shuttle",taxi:"Taxi",shinkansen:"Shinkansen",unknown:"Por confirmar"}as const)[mode];}

export function RouteSummary({segments,nameForId}:{segments:RouteSegment[];nameForId:(id:string)=>string}){
 const totalMinutes=segments.reduce((s,x)=>s+(x.minutes??0),0);const totalFare=segments.reduce((s,x)=>s+(x.fareJPYForTwo??0),0);
 if(!segments.length)return null;
 return <section className="routeSummary"><details><summary><span>🧭 Cómo se mueve el día</span><span>≈ {totalMinutes} min · {totalFare?copFromJPY(totalFare):"sin costo estimado"}</span></summary><div className="routeSegmentList">{segments.map((segment,index)=><article className="routeSegment" key={segment.id+index}><span className="routeMode">{segment.mode==="walk"?<Footprints size={16}/>:<TrainFront size={16}/>} {modeLabel(segment.mode)}</span><div><strong>{nameForId(segment.fromId)} → {nameForId(segment.toId)}</strong><small>{segment.line?`${segment.line} · `:""}{segment.minutes!=null?`≈ ${segment.minutes} min`:"tiempo por confirmar"}{segment.fareJPYForTwo!=null?` · ${segment.fareJPYForTwo===0?"Gratis":`${copFromJPY(segment.fareJPYForTwo)} para los dos`}`:" · tarifa por confirmar"}</small></div>{segment.googleMapsUrl?<a href={segment.googleMapsUrl} target="_blank" rel="noreferrer" aria-label="Abrir ruta"><ExternalLink size={16}/></a>:null}</article>)}</div></details></section>;
}
