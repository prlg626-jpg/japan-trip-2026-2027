import { ExternalLink, Hotel as HotelIcon, MapPin, Pencil } from "lucide-react";
import type { Hotel } from "../types";
import { formatMoney } from "../utils/money";

export function HotelLinkCard({ hotel, onEdit }: { hotel: Hotel; onEdit: (hotel: Hotel) => void }) {
  const hotelUrl = hotel.klookUrl || hotel.link;
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.address || hotel.name)}`;
  return (
    <article className="hotelLinkCard category-hotel">
      <div className="hotelLinkIcon"><HotelIcon size={21} /></div>
      <div className="hotelLinkBody">
        <span>Hotel base</span>
        <h3>{hotel.name}</h3>
        <p>{hotel.address}</p>
        <div className="hotelFacts">
          <span>{hotel.plannedNights} noches planificadas</span>
          {hotel.price.amount > 0 ? <span>{formatMoney(hotel.price.amount, hotel.price.currency)} cotizado</span> : null}
          <span>{hotel.status}</span>
        </div>
        {hotel.quoteWarning ? <div className="warningInline">⚠ {hotel.quoteWarning}</div> : null}
        <div className="actionRow">
          {hotelUrl ? <a className="chipButton" href={hotelUrl} target="_blank" rel="noreferrer"><ExternalLink size={15}/>Ver habitaciones y fotos</a> : null}
          <a className="chipButton" href={maps} target="_blank" rel="noreferrer"><MapPin size={15}/>Cómo llegar</a>
          <button className="chipButton" type="button" onClick={() => onEdit(hotel)}><Pencil size={15}/>Editar</button>
        </div>
      </div>
    </article>
  );
}
