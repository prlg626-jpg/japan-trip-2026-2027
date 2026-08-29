import type { TripState } from "../types";

const JPY_COP=19.3465, USD_COP=3071.41;
function moneyCOP(currency:string,unit:number,qty=1){const value=currency==="JPY"?unit*JPY_COP:currency==="USD"?unit*USD_COP:unit;return Math.round(value*qty);}
function fmt(n:number){return new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(n);}

const activityCopy:Record<string,{description?:string;price?:string;place?:string}>={
  "d27-usjgo":{place:"Imperial Hotel Osaka → Universal City Station",description:"Universal City es la zona y estación que sirve a Universal Studios Japan. Desde el Imperial Hotel calcula unos 45–55 min en transporte público; el destino real del traslado es Universal City Station y desde allí se camina al parque. Abre Maps para ver la combinación exacta de JR/metro del momento."},
  "d27-usj":{description:"Parque temático de Universal en Osaka. Aquí están Super Nintendo World, Mario Kart, Donkey Kong Country y otras áreas. El plan es dedicarle el día completo. El precio corresponde al paquete que veníamos manejando para dos personas; la disponibilidad y el Express Pass 8 deben verificarse cuando abra diciembre de 2026.",price:"Precio total para dos · entrada/paquete según disponibilidad"},
  "d27-dinner":{description:"Cena flexible después de USJ. Mejor escoger en Universal CityWalk o cerca del hotel según energía; no obliga a volver a Namba. Esta tarjeta es un espacio de comida, no un restaurante ya decidido."},
  "v7-28-rikuro":{description:"Pastelería clásica de Osaka famosa por el cheesecake japonés recién horneado, muy aireado y ligero. El precio es por una torta completa, suficiente para compartir entre los dos.",price:`${fmt(moneyCOP("JPY",1095))} por torta completa`},
  "d1-transfer":{description:"Traslado largo: llegar a Shin-Osaka, tomar Shinkansen hasta Odawara y desde Odawara continuar hacia Hakone-Yumoto/ryokan en tren local, bus o taxi según el ryokan elegido. La tarjeta se debe leer como transporte, no como un lugar turístico.",price:`≈ ${fmt(moneyCOP("JPY",12730,2))} para los dos · estimado`},
  "d1-checkin":{description:"Llegada al ryokan elegido. El último tramo desde Odawara/Hakone-Yumoto depende del alojamiento: cuando se escoja ryokan se mostrará si conviene tren local, bus o taxi y su costo."},
  "d4-disney":{description:"Día completo en Tokyo DisneySea, el parque Disney de temática marítima único de Japón. La tarjeta se completará con atracciones prioritarias y pases disponibles cuando abra la venta de enero de 2027."}
};

const placeCopy:Record<string,{description?:string;price?:string;rating?:string;url?:string}>={
  "zp-dotonbori":{description:"Barrio y corredor peatonal de neones y comida junto al canal. Es para explorar, fotografiar el Glico, picar comida y caminar; no es una actividad con hora fija."},
  "zp-shinsaibashi":{description:"Gran galería y calle comercial cubierta de Osaka, conectada naturalmente con Dotonbori y Namba. Se recorre a pie y sirve para compras sin horario rígido."},
  "zp-ajinoya":{description:"Okonomiyaki muy conocido en Namba. Tabelog lo incluye en su selección de 100 mejores de okonomiyaki 2025; queda a unos 3 min a pie de Namba Station.",price:`Aprox. ${fmt(moneyCOP("JPY",1000))}–${fmt(moneyCOP("JPY",3999))} por persona`,rating:"Tabelog 3.59 · 1.700+ reseñas",url:"https://tabelog.com/en/osaka/A2701/A270202/27001439/"},
  "zp-wanaka":{description:"Takoyaki clásico de Osaka en Sennichimae, cerca de Namba. Es una parada rápida de comida callejera, no una comida formal.",rating:"Tabelog · 3.000+ reseñas",url:"https://tabelog.com/en/osaka/A2701/A270202/27002320/"},
  "zp-yadoroku":{description:"Pequeño restaurante histórico de onigiri en Asakusa. Es buena opción de almuerzo si ese día están realmente por Asakusa, no para cruzar Tokio solo por comer.",price:`Aprox. ${fmt(moneyCOP("JPY",1000))}–${fmt(moneyCOP("JPY",1999))} por persona`,rating:"Tabelog 3.49 · cierra domingos"},
  "zp-jins":{description:"Óptica japonesa para escoger montura, hacer medición y montar lentes. No es una experiencia que normalmente requiera reserva: se entra a tienda y se compra. Los modelos estándar parten de ¥5.900 con lente claro estándar incluido.",price:`Desde ${fmt(moneyCOP("JPY",5900))} por par · desde ${fmt(moneyCOP("JPY",5900,2))} para dos pares`},
  "zp-nakano":{description:"Centro comercial especializado en anime, manga, coleccionismo y relojes. Está fuera del núcleo de Shinjuku: trátalo como bloque separado de 2–3 h; no conviene ir y volver a Shinjuku en medio del mismo recorrido."},
  "zp-pillow":{description:"Nihonbashi Nishikawa hace medición y ajuste para una almohada personalizada. El valor alto corresponde a comprar la almohada terminada, no a pagar una simple reserva o medición."},
  "zp-teamlab":{description:"Museo digital inmersivo de teamLab en Toyosu. Se camina dentro de instalaciones de luz, agua y proyecciones; requiere entrada con hora, así que funciona como ancla del día."}
};

export function enrichTripStateV8(input:TripState):TripState{
  const state=structuredClone(input); state.schemaVersion=8;
  const d26=state.days.find(d=>d.id==="2026-12-26");
  if(d26){d26.title="Recuperación libre · paseo sin agenda";d26.pace="Muy tranquilo";d26.summary="Dormir, desayunar tarde y salir solo si provoca. El mapa muestra opciones cercanas; ninguna queda seleccionada por defecto.";d26.why="Es el segundo día de recuperación del vuelo. No hay reservas ni obligación de completar una lista.";d26.routeNote="Elijan 1–2 puntos cercanos según energía; la ruta se recalcula con lo que activen.";}
  state.activities.forEach(a=>{
    if(a.dayId==="2026-12-26"&&a.id.startsWith("v7-26-")){a.dayId="v8-options-2026-12-26";a.included=false;}
    const c=activityCopy[a.id]; if(c){if(c.description){a.description=c.description;a.note=c.description;} if(c.place)a.place=c.place;if(c.price)a.priceLabel=c.price;}
    if(a.priceOriginal?.unit&&(!a.estimatedCostCOP||a.estimatedCostCOP===0)){const qty=a.priceScope==="per_person"?2:(a.priceOriginal.quantity||1);a.estimatedCostCOP=moneyCOP(a.priceOriginal.currency,a.priceOriginal.unit,qty);}
  });
  state.zonePlaces.forEach(p=>{
    if(p.suggestedDayId==="2026-12-26")p.selected=false;
    const c=placeCopy[p.id]; if(c){if(c.description)p.description=c.description;if(c.price)p.priceLabel=c.price;if(c.rating)p.ratingContext=c.rating;if(c.url)p.officialUrl=c.url;}
  });
  state.days.forEach(d=>{if(d.city==="Osaka"&&d.dayRoute?.city==="Kyoto")d.dayRoute=null;if(d.routeNote)d.routeNote=d.routeNote.replace(/despues salen hacia Kyoto\.?/gi,"").replace(/hacia Kyoto/gi,"");});
  return state;
}
