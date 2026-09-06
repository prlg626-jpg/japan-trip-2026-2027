import type { TripState } from "../types";

const MAX_COP = 2_100_000;

/**
 * Live shortlist for Hakone, 1–2 Jan 2027, 2 adults / 1 room.
 * Hard requirements: private in-room open/semi-open hot-spring bath, live inventory,
 * and final visible total (rate + taxes/fees where exposed) <= COP 2.1M.
 * Checked on 2026-09-06. New Year inventory is volatile, so re-check before paying.
 */
export function applyRyokanAvailability2027(input: TripState): TripState {
  const state = structuredClone(input);

  // Do not pad this list with public-onsen-only or cheaper mediocre options.
  // Under the exact New Year dates, this was the only strict live match found
  // after checking the premium/Ginyu-like set and broader Hakone inventory.
  state.ryokanCandidates = [
    {
      id: "ryokan-marroad-private-open-air",
      name: "Hotel Marroad Hakone · Superior Twin con onsen privado",
      rank: 1,
      why: "MATCH ESTRICTO 1–2 ene. Habitación Superior Twin de 28 m² con baño termal privado al aire libre y vista a la montaña. La oferta live con desayuno queda aprox. en COP 1.988.106 total para dos incluyendo los impuestos visibles. No llega al nivel boutique de Ginyu, pero sí cumple simultáneamente disponibilidad, onsen privado real y techo de COP 2.100.000.",
      officialUrl: "https://vio.com/m/s/aa5c07b4",
      klookUrl: "https://vio.com/m/s/a664aeb0",
      privateOnsenRoom: "Sí. La habitación exacta es Superior Twin Room: private open-air bath, vista a la montaña, 28 m², 2 camas twin. Verificar que el checkout mantenga esta categoría y no Twin Classic.",
      privateBathReservable: true,
      checkIn: "15:00",
      checkOut: "11:00",
      priceForTwoCOP: 1_988_106,
      budgetRisk: false,
      selected: false,
    },
  ];

  const hakone = state.hotels.find((hotel) => hotel.id === "hotel-hakone");
  if (hakone) {
    hakone.name = "Hakone · onsen privado por escoger";
    hakone.price = { amount: MAX_COP, currency: "COP", amountCOP: MAX_COP };
    hakone.budgetCOP = MAX_COP;
    hakone.status = "Pendiente de escoger · techo COP 2.100.000";
    hakone.notes = "Requisito cerrado: 1–2 ene 2027, 2 adultos, onsen privado dentro de la habitación, bonito/buen nivel y máximo COP 2.100.000 total. El shortlist activo solo muestra coincidencias verificadas; no se rellenará con opciones de onsen público.";
  }

  state.budget.hotelBudgets = state.budget.hotelBudgets.map((entry) =>
    entry.city === "Hakone" ? { ...entry, nights: 1, budget: MAX_COP } : entry,
  );

  state.notes["ryokan-availability-2027-01-01"] =
    "Revisión live 6 sep 2026 para 1–2 ene 2027, 2 adultos, 1 habitación. Nuevo techo COP 2.100.000 TOTAL y onsen privado obligatorio. MATCH: Hotel Marroad Hakone Superior Twin con private open-air bath ~COP 1.988.106 total. REFERENCIA GINYU: Hakone Ginyu sigue siendo el estándar estético, pero no apareció una oferta live que cumpla el techo para esas fechas. DESCARTADOS: LiVEMAX RESORT Hakone Sengokuhara, Junior Suite 52 m² con semi open-air bath, ~COP 2.265.490 total; Merveille Hakone Gora, Twin with Open-Air Bath, ~COP 2.507.256 total; Tsukino Yado Sara, Private Open-Air Bath, ~COP 2.655.128 total; Bettei Koyoi, Open-Air Bath + mountain view, ~COP 3.691.216 total; Hakone Airu, habitaciones con open-air bath, >COP 3,17 M; Kinnotake Tonosawa, >COP 5,5 M. Gora Kadan, Hakone Suishoen, Hakone Kyuan, Hakone Gora Byakudan, Gora Kansuiro y Rakuten STAY VILLA Sengokuhara no mostraron oferta live válida para las fechas exactas. Tenyu y Laforet también quedan fuera por precio de Año Nuevo. No incluir opciones con onsen únicamente público.";

  const prefix = "Ryokan 1–2 ene 2027:";
  state.decisions = state.decisions.filter((item) => !item.startsWith(prefix));
  state.decisions.push(`${prefix} máximo COP 2.100.000 total; onsen privado en habitación obligatorio; shortlist sin relleno de opciones públicas o de menor nivel.`);

  return state;
}
