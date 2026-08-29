import { useMemo, useState } from "react";
import { Check, ExternalLink, MapPin, RotateCcw, Sparkles } from "lucide-react";
import type { Zone, ZonePlace } from "../types";

const categoryNames: Record<string,string> = { explore:"Explorar", tourism:"Turismo", experience:"Experiencia", museum:"Museo", anime:"Anime / gaming", gaming:"Gaming", shopping:"Compras", nature:"Naturaleza", market:"Mercado", food:"Restaurante", cafe:"Café" };

export function ZoneExplorer({ zones, places, onToggle, onRecommended, onClear, ordinalOffset = 0 }: { zones: Zone[]; places: ZonePlace[]; onToggle: (place: ZonePlace) => void; onRecommended: () => void; onClear: () => void; ordinalOffset?: number }) {
  const [filter,setFilter]=useState("all");
  const categories=useMemo(()=>Array.from(new Set(places.map(p=>p.category))).sort(),[places]);
  const visible=places.filter(p=>filter==="all" || p.category===filter || (filter==="essential" && p.priorityRank==="essential") || (filter==="selected" && p.selected));
  const selected=places.filter(p=>p.selected).sort((a,b)=>a.order-b.order);
  const ordinal=new Map(selected.map((p,i)=>[p.id,i+1+ordinalOffset]));
  if (!zones.length && !places.length) return null;
  return (
    <section className="zoneExplorer">
      <header className="zoneHeader">
        <div><span>Explorar zona · tú decides</span><h3>{zones.map(z=>z.name).join(" + ")}</h3><p>{zones.map(z=>z.description).join(" ")}</p></div>
        <div className="zoneActions"><button className="chipButton" type="button" onClick={onRecommended}><Sparkles size={15}/>Seleccionar recomendados</button><button className="chipButton" type="button" onClick={onClear}><RotateCcw size={15}/>Limpiar</button></div>
      </header>
      <div className="filterStrip"><button className={filter==="all"?"active":""} onClick={()=>setFilter("all")}>Todo</button><button className={filter==="selected"?"active":""} onClick={()=>setFilter("selected")}>Seleccionados ({selected.length})</button><button className={filter==="essential"?"active":""} onClick={()=>setFilter("essential")}>Imprescindible</button>{categories.map(c=><button key={c} className={filter===c?"active":""} onClick={()=>setFilter(c)}>{categoryNames[c]??c}</button>)}</div>
      <div className="zonePlaceList">
        {visible.map(place=>(
          <article key={place.id} className={`zonePlaceCard category-${place.category} ${place.selected?"selected":""}`}>
            <button className="selectPlace" type="button" onClick={()=>onToggle({...place,selected:!place.selected})} aria-label={place.selected?"Quitar del día":"Añadir al día"}>{place.selected ? <span className="ordinal">{ordinal.get(place.id)}</span> : <span className="emptyCheck"><Check size={15}/></span>}</button>
            <div className="zonePlaceMain">
              <div className="zonePlaceTitle"><div><span>{categoryNames[place.category]??place.category} · {place.priorityRank}</span><h4>{place.title}</h4></div>{place.reservationRequired?<span className="reservationBadge">Reserva</span>:null}</div>
              <p>{place.description}</p>
              <div className="placeMeta"><span>{place.estimatedDurationMinutes ? `≈ ${place.estimatedDurationMinutes} min` : "Duración flexible"}</span><span>{place.priceLabel || "Precio por verificar"}</span>{place.holidayNote?<span className="warningText">⚠ {place.holidayNote}</span>:null}</div>
              <div className="actionRow">{place.officialUrl?<a className="chipButton" href={place.officialUrl} target="_blank" rel="noreferrer"><ExternalLink size={14}/>Oficial</a>:null}<a className="chipButton" href={place.googleMapsUrl} target="_blank" rel="noreferrer"><MapPin size={14}/>Maps</a><button className="chipButton" type="button" onClick={()=>onToggle({...place,selected:!place.selected})}>{place.selected?"Quitar":"Añadir a mi día"}</button></div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
