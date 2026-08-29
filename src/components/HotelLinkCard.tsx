import { ExternalLink, Hotel as HotelIcon, MapPin, Pencil } from "lucide-react";
import type { Hotel } from "../types";
import { formatCOP } from "../utils/money";
import "../v8.css";

export function HotelLinkCard({hotel,onEdit}:{hotel:Hotel;onEdit:(hotel:Hotel)=>void}){
 const hotelUrl=hotel.klookUrl||hotel.link;const maps=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.address||hotel.name)}`;const cop=hotel.price.amountCOP||hotel.budgetCOP||0;
 return <article className="hotelLinkCard category-hotel"><div className="hotelLinkIcon"><HotelIcon size={21}/></div><div className="hotelLinkBody"><span>🏨 Hotel base</span><h3>{hotel.name}</h3><p><strong>Dirección:</strong> {hotel.address||"Por confirmar"}</p><div className="hotelFacts"><span>{hotel.plannedNights} noches</span>{cop>0?<span>{formatCOP(cop)} · cotización conocida</span>:null}<span>{hotel.status}</span></div>{hotel.quoteWarning?<div className="warningInline">⚠ {hotel.quoteWarning}</div>:null}<div className="actionRow">{hotelUrl?<a className="chipButton" href={hotelUrl} target="_blank" rel="noreferrer"><ExternalLink size={15}/>Fotos y habitaciones</a>:null}<a className="chipButton" href={maps} target="_blank" rel="noreferrer"><MapPin size={15}/>Mapa</a><button className="chipButton" type="button" onClick={()=>onEdit(hotel)}><Pencil size={15}/>Editar</button></div></div></article>;
}
