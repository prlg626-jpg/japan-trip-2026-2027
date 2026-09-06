import type { TripState } from "../types";

const MAX_COP = 1_600_000;

/**
 * Live shortlist for Hakone, 1–2 Jan 2027, 2 adults / 1 room.
 * Prices below include the visible taxes/fees from the live offer checked on 2026-09-06.
 * Inventory is volatile, so each candidate carries a direct live-rate link for re-checking.
 */
export function applyRyokanAvailability2027(input: TripState): TripState {
  const state = structuredClone(input);

  state.ryokanCandidates = [
    {
      id: "ryokan-livemax-sengokuhara",
      name: "LiVEMAX RESORT Hakone Sengokuhara",
      rank: 1,
      why: "DISPONIBLE 1–2 ene. La opción que más se parece a lo que buscábamos: ryokan con onsen y habitación japonesa amplia con baño semiabierto privado. La tarifa live más barata vista queda aprox. en COP 1.585.534 con impuestos/tasas, justo debajo del techo. La habitación con baño semiabierto tiene 52 m².",
      officialUrl: "https://vio.com/m/s/a37253eb",
      klookUrl: "https://vio.com/m/s/fca617e4",
      privateOnsenRoom: "Sí: hay habitación Japanese-Style Junior Suite con semi open-air bath privado. Confirmar que la tarifa elegida corresponda a esa categoría antes de pagar.",
      privateBathReservable: true,
      checkIn: "15:00",
      checkOut: "11:00",
      priceForTwoCOP: 1_585_534,
      budgetRisk: false,
      selected: false,
    },
    {
      id: "ryokan-hakone-kogen",
      name: "Hakone Kogen Hotel",
      rank: 2,
      why: "DISPONIBLE 1–2 ene. Muy buena opción si priorizamos experiencia japonesa + onsen + cena/desayuno: el plan half-board visible queda aprox. en COP 1.541.217 con impuestos. Habitación japonesa de 10 tatamis. No tiene onsen privado en la habitación, pero entra cómodo en el presupuesto y deja la noche completa resuelta.",
      officialUrl: "https://vio.com/m/s/ea9a5efe",
      klookUrl: "https://vio.com/m/s/690b20a5",
      privateOnsenRoom: "No en la habitación verificada. Tiene baños termales del hotel.",
      privateBathReservable: false,
      checkIn: "15:00",
      checkOut: "10:00",
      priceForTwoCOP: 1_541_217,
      budgetRisk: false,
      selected: false,
    },
    {
      id: "ryokan-yushintei",
      name: "Yushintei · Hakone Yumoto",
      rank: 3,
      why: "DISPONIBLE 1–2 ene. Ryokan de 4 estrellas en Yumoto, adults-only, con ambiente tradicional y buena logística para llegar/salir. La tarifa visible con desayuno queda aprox. en COP 1.112.466 con impuestos. Es menos espectacular que LiVEMAX, pero bastante más holgado de presupuesto.",
      officialUrl: "https://vio.com/m/s/25463459",
      klookUrl: "https://vio.com/m/s/2869ad69",
      privateOnsenRoom: "No confirmado en la habitación disponible; la oferta visible es Japanese-Style Standard Room con baño compartido.",
      privateBathReservable: false,
      checkIn: "15:00",
      checkOut: "10:00",
      priceForTwoCOP: 1_112_466,
      budgetRisk: false,
      selected: false,
    },
    {
      id: "ryokan-kagetsuen",
      name: "Kagetsuen · Sengokuhara",
      rank: 4,
      why: "DISPONIBLE 1–2 ene. Ryokan de 4 estrellas con hot springs, jardín y habitación japonesa renovada. La tarifa live con desayuno queda aprox. en COP 1.059.966 con impuestos. Muy buen colchón frente al techo, aunque no es la opción más íntima ni premium de la lista.",
      officialUrl: "https://vio.com/m/s/c82c7539",
      klookUrl: "https://vio.com/m/s/9e61668b",
      privateOnsenRoom: "No confirmado en la habitación disponible.",
      privateBathReservable: false,
      checkIn: "15:00",
      checkOut: "11:00",
      priceForTwoCOP: 1_059_966,
      budgetRisk: false,
      selected: false,
    },
    {
      id: "ryokan-chojuyu",
      name: "Chojuyu Hakone",
      rank: 5,
      why: "DISPONIBLE 1–2 ene. Opción económica de ryokan tradicional con hot springs en Sengokuhara. La tarifa visible queda aprox. en COP 463.413 con impuestos/tasas. La dejaría como backup por precio, no como primera elección para una única noche especial en Hakone.",
      officialUrl: "https://vio.com/m/s/845d7d9b",
      klookUrl: "https://vio.com/m/s/ee34a771",
      privateOnsenRoom: "No. Habitación japonesa con futones; onsen del alojamiento.",
      privateBathReservable: false,
      checkIn: "15:00",
      checkOut: "10:00",
      priceForTwoCOP: 463_413,
      budgetRisk: false,
      selected: false,
    },
  ];

  const hakone = state.hotels.find((hotel) => hotel.id === "hotel-hakone");
  if (hakone) {
    hakone.name = "Ryokan Hakone · por escoger";
    hakone.price = { amount: MAX_COP, currency: "COP", amountCOP: MAX_COP };
    hakone.budgetCOP = MAX_COP;
    hakone.status = "Pendiente de escoger · techo COP 1.600.000";
    hakone.notes = "Shortlist actualizado con inventario live para 1–2 ene 2027, 2 adultos, 1 habitación. Solo quedan candidatos cuyo total visible con impuestos/tasas no supera COP 1.600.000. Volver a abrir el enlace antes de pagar porque Año Nuevo puede cambiar inventario y tarifa.";
  }

  state.budget.hotelBudgets = state.budget.hotelBudgets.map((entry) =>
    entry.city === "Hakone" ? { ...entry, nights: 1, budget: MAX_COP } : entry,
  );

  state.notes["ryokan-availability-2027-01-01"] =
    "Revisión live 6 sep 2026 para 1–2 ene 2027, 2 adultos, 1 habitación, techo COP 1.600.000 total. Hakone Ginyu: sin oferta disponible dentro del filtro y rango típico ~COP 2,10–2,20 M; descartado. Hakone Suimeisou: 0 ofertas live; descartado por falta de disponibilidad. Hakone Kowakien Ten-yu: 0 ofertas live y rango típico ~COP 1,90–2,00 M; descartado. Hatsuhana: 0 ofertas live y rango típico ~COP 2,96–3,06 M; descartado. Merveille Hakone Gora mostró oferta, pero el total con impuestos queda ~COP 1,612 M, por encima del techo; descartado por regla estricta.";

  const prefix = "Ryokan 1–2 ene 2027:";
  state.decisions = state.decisions.filter((item) => !item.startsWith(prefix));
  state.decisions.push(`${prefix} shortlist live filtrado a máximo COP 1.600.000 total para dos; links de verificación incluidos.`);

  return state;
}
