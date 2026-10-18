import type { Activity, ZonePlace } from "../types";

export interface MealRecommendation {
  name: string;
  address: string;
  description: string;
  officialUrl: string;
  mapsUrl: string;
}

function recommendation(name: string, address: string, description: string, officialUrl: string): MealRecommendation {
  return { name, address, description, officialUrl,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name}, ${address}`)}` };
}

// Primary restaurant/building directories checked 17 Oct 2026. These are
// proposals, not bookings; holiday opening and menus need reconfirmation.
export const MEAL_RECOMMENDATIONS = {
  shimbashi: recommendation("Torikizoku · Shimbashi Plaza Building", "Shimbashi Plaza Building, 4-9-1 Shimbashi, Minato-ku, Tokyo · 3F",
    "Cena informal de yakitori y platos para compartir cerca del hotel. Si prefieren escoger entre varias cocinas, alternativa: restaurantes de Caretta Shiodome B2F. Consultar horario especial de Año Nuevo y mesa; no hay reserva hecha.",
    "https://map.torikizoku.co.jp/detail/664/"),
  ginza: recommendation("HIBIYA FOOD HALL · Tokyo Midtown Hibiya B1F", "1-1-2 Yurakucho, Chiyoda-ku, Tokyo",
    "Zona concreta para almorzar o cenar con varias opciones: Susan’s MEAT BALL, VIETNAMESE CYCLO o Bar & Tapas Celona. Sirve al pasar entre Ginza y Hibiya. Revisar la apertura especial de Año Nuevo y elegir según la fila y el menú.",
    "https://www.hibiya.tokyo-midtown.com/the_restaurant/shop_list/"),
  umeda: recommendation("LUCUA Dining 10F / LUCUA Food Hall B2F", "3-1-3 Umeda, Kita-ku, Osaka",
    "Dos plantas concretas para comer junto a Osaka Station: restaurantes en 10F y opciones informales en el Food Hall B2F. Útil para la cena tras llegar a Osaka y durante las compras de Umeda. Elegir según energía, fila y presupuesto; confirmar última orden.",
    "https://www.lucua.jp/en/shopguide/shop.html"),
  universal: recommendation("Shinobuan · Universal CityWalk Osaka 5F", "Universal CityWalk Osaka, junto a Universal City Station · 5F",
    "Soba, udon y bowls de arroz para cenar al salir de USJ, antes del tren al hotel. Alternativa en el mismo piso: Inaba Wako, de tonkatsu. La planta suele abrir hasta las 23:00; última orden y horario de cada local por confirmar.",
    "https://ucw.jp/restaurant/"),
  minami: recommendation("Harijyu Dotonbori · restaurante principal", "1-9-17 Dotonbori, Chuo-ku, Osaka",
    "Propuesta para una cena especial: sukiyaki o shabu-shabu de wagyu. Consultar menú, presupuesto y reserva. Para el 31 de diciembre confirmar expresamente apertura y última orden; no se da por confirmado un servicio de Nochevieja.",
    "https://www.harijyu.co.jp/"),
  shinjuku: recommendation("NEWoMan Shinjuku · Food Hall", "NEWoMan Shinjuku / JR Shinjuku Station, salida New South · Food Hall",
    "Punto concreto con varias opciones: Bakery & Restaurant Sawamura, SALON BUTCHER & BEER y Oyster Bar wharf. Elegir almuerzo o cena según dónde termine el recorrido; comprobar acceso desde fuera de los tornos y horario del local.",
    "https://www.newoman.jp/shinjuku/restaurant/index.php"),
  aoyama: recommendation("bonélan · GYRE.FOOD 4F", "5-10-1 Jingumae, Shibuya-ku, Tokyo · GYRE 4F",
    "Bistró francés para almuerzo o cena en Omotesando. En el mismo piso, uni ofrece café y deli durante el día. Consultar menú, precio y mesa; los horarios especiales de Año Nuevo pueden cambiar.",
    "https://gyre-omotesando.com/shopsandrestaurants/gyre-food/"),
  asakusa: recommendation("Tokyo Solamachi · restaurantes 6F / 7F", "1-1-2 Oshiage, Sumida-ku, Tokyo · Tokyo Solamachi",
    "Zona de restaurantes junto a Tokyo Skytree, con cocina japonesa y otras opciones. Encaja solo si el recorrido llega a Skytree/Oshiage; desde Asakusa implica desplazarse. Elegir local en el directorio y confirmar horario.",
    "https://www.tokyo-solamachi.jp/restaurant/"),
};

type MealLike = Pick<Activity | ZonePlace, "id" | "title" | "zoneId"> & { place?: string; address?: string; dayId?: string; status?: string };

/** Read-time enrichment of generic live cards. No seed or user data is replaced. */
export function mealRecommendationFor(item: MealLike, dayId = item.dayId): MealRecommendation | null {
  if (dayId === "2027-01-07" || ["reservada", "pagada", "completada"].includes(item.status ?? "")) return null;
  const title = item.title.toLowerCase();
  if (!/cena|almuerzo|lunch|dinner/.test(title)) return null;
  const generic = /tranquil|por elegir|por definir|flexible|libre|sin prisa|regreso|nochevieja|cena fácil|cerca del hotel/.test(title)
    || /^(cena|almuerzo|lunch|dinner)( especial| ligero| rápido)?$/.test(title)
    || /^(cena|almuerzo|lunch|dinner) (en|por) (shimbashi|shinbashi|umeda|ginza|shinjuku|asakusa|omotesando|namba)/.test(title);
  if (!generic) return null; // A named restaurant chosen by the user wins.
  const location = `${item.place ?? ""} ${item.address ?? ""} ${item.zoneId ?? ""} ${title}`.toLowerCase();
  if (/shimbashi|shinbashi|shiodome|arrival-shimbashi/.test(location)) return MEAL_RECOMMENDATIONS.shimbashi;
  if (/universal|usj/.test(location) || item.id === "d27-dinner") return MEAL_RECOMMENDATIONS.universal;
  if (/nochevieja|minami|namba|dotonbori|shinsaibashi/.test(location)) return MEAL_RECOMMENDATIONS.minami;
  if (/umeda|osaka|monterey/.test(location)) return MEAL_RECOMMENDATIONS.umeda;
  if (/ginza|hibiya|nihonbashi|kyobashi/.test(location)) return MEAL_RECOMMENDATIONS.ginza;
  if (/shinjuku|nakano/.test(location)) return MEAL_RECOMMENDATIONS.shinjuku;
  if (/omotesando|shibuya|harajuku|aoyama/.test(location)) return MEAL_RECOMMENDATIONS.aoyama;
  if (/skytree|oshiage/.test(location)) return MEAL_RECOMMENDATIONS.asakusa;
  // Only fill known itinerary locations, never invent a restaurant for an
  // unknown town or insert one into a flight/transfer day.
  if (["2027-01-01", "2027-01-02", "2027-01-08"].includes(dayId ?? "")) return MEAL_RECOMMENDATIONS.shimbashi;
  return null;
}
