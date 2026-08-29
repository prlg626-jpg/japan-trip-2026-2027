import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const DEFAULT_SOURCE =
  "C:\\Users\\USUARIO\\Downloads\\JP_Itinerario_Hoteles_Rutas_v6.html";
const sourceFile = process.argv[2] || DEFAULT_SOURCE;
const outFile =
  process.argv[3] || path.resolve(process.cwd(), "src/data/initialTrip.json");

function readHtml(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`Source HTML not found: ${file}`);
  }
  return fs.readFileSync(file, "utf8");
}

function createStubElement(selector = "") {
  const element = {
    selector,
    dataset: {},
    style: {},
    children: [],
    options: [],
    files: [],
    value: "",
    checked: false,
    hidden: false,
    _html: "",
    _text: "",
    classList: {
      add() {},
      remove() {},
      toggle() {},
      contains() {
        return false;
      },
    },
    parentElement: {
      classList: {
        add() {},
        remove() {},
        toggle() {},
        contains() {
          return false;
        },
      },
    },
    set innerHTML(value) {
      this._html = String(value ?? "");
    },
    get innerHTML() {
      return this._html;
    },
    set textContent(value) {
      this._text = String(value ?? "");
    },
    get textContent() {
      return this._text;
    },
    appendChild(child) {
      this.children.push(child);
      if (child?.tagName === "option" || selector.includes("select")) {
        this.options.push(child);
      }
      return child;
    },
    prepend(child) {
      this.children.unshift(child);
      return child;
    },
    insertBefore(child) {
      this.children.unshift(child);
      if (child?.tagName === "option" || selector.includes("select")) {
        this.options.unshift(child);
      }
      return child;
    },
    insertAdjacentElement(_position, child) {
      this.children.push(child);
      return child;
    },
    insertAdjacentHTML(_position, html) {
      this._html += String(html ?? "");
    },
    addEventListener() {},
    removeEventListener() {},
    setAttribute(name, value) {
      this[name] = value;
    },
    getAttribute(name) {
      return this[name] ?? null;
    },
    querySelector() {
      return createStubElement("nested");
    },
    querySelectorAll() {
      return [];
    },
    scrollIntoView() {},
    click() {},
    remove() {},
    reset() {
      this.value = "";
    },
  };
  return element;
}

function createDomContext() {
  const elements = new Map();
  const getElement = (selector) => {
    const key = String(selector);
    if (!elements.has(key)) elements.set(key, createStubElement(key));
    return elements.get(key);
  };
  const storage = new Map();
  const context = {
    console,
    structuredClone,
    setTimeout(callback) {
      if (typeof callback === "function") callback();
      return 0;
    },
    clearTimeout() {},
    alert() {},
    confirm() {
      return true;
    },
    FileReader: class {},
    Blob: class {
      constructor(parts, options) {
        this.parts = parts;
        this.options = options;
      }
    },
    URL: {
      createObjectURL() {
        return "blob:stub";
      },
      revokeObjectURL() {},
    },
    indexedDB: {
      open() {
        throw new Error("IndexedDB is not available in extractor");
      },
    },
    localStorage: {
      getItem(key) {
        return storage.has(key) ? storage.get(key) : null;
      },
      setItem(key, value) {
        storage.set(key, String(value));
      },
      removeItem(key) {
        storage.delete(key);
      },
      clear() {
        storage.clear();
      },
    },
    document: {
      body: createStubElement("body"),
      createElement(tagName) {
        const el = createStubElement(tagName);
        el.tagName = String(tagName).toLowerCase();
        return el;
      },
      querySelector: getElement,
      querySelectorAll() {
        return [];
      },
      addEventListener() {},
    },
    navigator: { onLine: true },
    location: { href: "http://localhost/extractor" },
    open() {},
  };
  context.window = context;
  return context;
}

function extractScripts(html) {
  return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
}

function extractConstLiteral(html, name) {
  const marker = `const ${name}=`;
  const start = html.indexOf(marker);
  if (start < 0) throw new Error(`Could not find const ${name}`);
  let i = start + marker.length;
  while (/\s/.test(html[i])) i += 1;
  const open = html[i];
  const close = open === "{" ? "}" : open === "[" ? "]" : null;
  if (!close) throw new Error(`Unsupported literal for ${name}`);
  let depth = 0;
  let stringQuote = null;
  let escaped = false;
  for (let j = i; j < html.length; j += 1) {
    const ch = html[j];
    if (stringQuote) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === stringQuote) stringQuote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      stringQuote = ch;
      continue;
    }
    if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) return html.slice(i, j + 1);
    }
  }
  throw new Error(`Unclosed literal for ${name}`);
}

function extractStringConst(html, name) {
  const match = html.match(new RegExp(`const\\s+${name}\\s*=\\s*(['"\`])([\\s\\S]*?)\\1`));
  if (!match) throw new Error(`Could not find string const ${name}`);
  return vm.runInNewContext(match[0].replace(/^const\s+\w+\s*=\s*/, ""));
}

function evalLiteral(literal, extraContext = {}) {
  return vm.runInNewContext(`(${literal})`, extraContext);
}

function minutes(time) {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return null;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function durationMinutes(start, end) {
  const a = minutes(start);
  const b = minutes(end);
  if (a == null || b == null || b < a) return null;
  return b - a;
}

function slug(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function stageFromStatus(status = "", activity = {}) {
  const text = `${status} ${activity.kind ?? ""}`.toLowerCase();
  if (text.includes("comprado") || text.includes("pagado")) return "pagada";
  if (text.includes("complet")) return "completada";
  if (text.includes("reservado")) return "reservada";
  if (activity.fixed || text.includes("fijo")) return "reservada";
  if (
    text.includes("reserv") ||
    text.includes("confirmar") ||
    text.includes("prioridad") ||
    text.includes("solicitar")
  ) {
    return "pendiente_de_reservar";
  }
  return activity.flexible || !activity.included ? "idea" : "pendiente_de_reservar";
}

function cityForDate(date, hotels) {
  if (date >= "2026-12-25" && date <= "2026-12-28") return "Osaka";
  if (date >= "2026-12-28" && date <= "2026-12-31") return "Kyoto";
  if (date === "2027-01-01") return "Hakone";
  if (date >= "2027-01-02" && date <= "2027-01-09") return "Tokyo";
  return hotels.find((h) => h.city === "Tokyo")?.city ?? null;
}

function toGoogleMaps(place) {
  return place
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`
    : "";
}

function routeUrl(from, to) {
  if (!from || !to) return "";
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
    from,
  )}&destination=${encodeURIComponent(to)}&travelmode=transit`;
}

function buildData(html, sourceStats) {
  const scripts = extractScripts(html);
  const context = createDomContext();
  const captureCode = `
${scripts.join("\n;\n")}
globalThis.__tripDump = {
  base: BASE,
  plan,
  budgetState,
  costItems: COST_ITEMS,
  manualChecks: MANUAL_CHECKS,
  defaultBudget: DEFAULT_BUDGET,
  liveFx: LIVE_FX_DEFAULT
};
`;
  vm.runInNewContext(captureCode, context, { filename: "JP_Itinerario_Hoteles_Rutas_v6.html" });

  const dump = context.__tripDump;
  const churchAddr = extractStringConst(html, "churchAddr");
  const hotelRoutes = evalLiteral(extractConstLiteral(html, "HOTEL_ROUTES"));
  const dayRoutes = evalLiteral(extractConstLiteral(html, "DAY_ROUTE"), { churchAddr });
  const sourceActivities = [];
  const sourceByUrl = new Map();

  const addSource = (source, activityId = null) => {
    if (!source?.url) return null;
    const id = sourceByUrl.get(source.url)?.id ?? `src-${sourceByUrl.size + 1}`;
    const existing = sourceByUrl.get(source.url) ?? {
      id,
      type: source.type || "Fuente",
      handle: source.handle || "",
      url: source.url,
      note: source.note || "",
      used: Array.isArray(source.used) ? [...source.used] : [],
      associatedActivityIds: [],
    };
    if (activityId && !existing.associatedActivityIds.includes(activityId)) {
      existing.associatedActivityIds.push(activityId);
    }
    sourceByUrl.set(source.url, existing);
    return id;
  };

  for (const source of dump.base.sources ?? []) addSource(source);

  const hotels = (dump.budgetState.hotelCandidates ?? dump.defaultBudget.hotels).map((hotel) => ({
    id: `hotel-${slug(hotel.city)}`,
    city: hotel.city,
    name: hotel.name ?? (hotel.city === "Hakone" ? "Ryokan por escoger" : ""),
    price: {
      amount: hotel.quoteUSD ?? hotel.budgetCOP ?? hotel.budget ?? 0,
      currency: hotel.quoteUSD == null ? "COP" : "USD",
      amountCOP:
        hotel.quoteUSD == null
          ? hotel.budgetCOP ?? hotel.budget ?? 0
          : Math.round(hotel.quoteUSD * Number(dump.budgetState.fx?.USD ?? dump.liveFx.USD)),
    },
    budgetCOP: hotel.budgetCOP ?? hotel.budget ?? 0,
    nights: hotel.nights ?? 0,
    link: hotel.url ?? "",
    status: hotel.status ?? "Pendiente",
    reservation: "",
    notes: hotel.fit ?? "",
    address: hotel.address ?? "",
    lat: hotel.lat ?? null,
    lon: hotel.lon ?? null,
    paid: false,
  }));

  const days = dump.plan.days.map((day) => {
    const hotelCity = cityForDate(day.date, hotels);
    const hotel = hotels.find((h) => h.city === hotelCity);
    const route = dayRoutes[day.date];
    return {
      id: day.date,
      date: day.date,
      label: day.label,
      city: day.city,
      title: day.title,
      pace: day.pace,
      summary: day.summary,
      why: day.why,
      routeNote: day.routeNote,
      hotelId: hotel?.id ?? null,
      dayRoute: route
        ? {
            ...route,
            googleMapsUrl: routeUrl(route.from, route.to),
          }
        : null,
      activityIds: day.activities.map((activity) => activity.id),
    };
  });

  const activities = dump.plan.days.flatMap((day) =>
    day.activities.map((activity, order) => {
      const directSourceId = addSource(activity.source, activity.id);
      if (activity.source?.url) sourceActivities.push(activity.id);
      const cost = dump.costItems.find((item) => item.id === activity.id);
      return {
        id: activity.id,
        dayId: day.date,
        order,
        start: activity.start ?? "",
        end: activity.end ?? "",
        durationMinutes: durationMinutes(activity.start, activity.end),
        title: activity.title,
        place: activity.place,
        kind: activity.kind,
        lat: activity.lat ?? null,
        lon: activity.lon ?? null,
        bookingUrl: activity.booking ?? "",
        googleMapsUrl: toGoogleMaps(activity.place),
        legacyStatus: activity.status ?? "",
        status: stageFromStatus(activity.status, activity),
        note: activity.note ?? "",
        priority: Boolean(activity.priority),
        included: activity.included !== false,
        flexible: Boolean(activity.flexible),
        fixed: Boolean(activity.fixed),
        sourceIds: directSourceId ? [directSourceId] : [],
        costItemId: cost?.id ?? null,
        estimatedCostCOP: cost ? null : 0,
        actualPaidCOP: 0,
      };
    }),
  );

  for (const source of sourceByUrl.values()) {
    for (const used of source.used ?? []) {
      const needle = String(used).toLowerCase();
      for (const activity of activities) {
        if (
          activity.title.toLowerCase().includes(needle) ||
          needle.includes(activity.title.toLowerCase())
        ) {
          if (!source.associatedActivityIds.includes(activity.id)) {
            source.associatedActivityIds.push(activity.id);
          }
          if (!activity.sourceIds.includes(source.id)) activity.sourceIds.push(source.id);
        }
      }
    }
  }

  const costs = dump.costItems.map((item) => ({
    id: item.id,
    activityId: activities.some((a) => a.id === item.id) ? item.id : null,
    date: item.date,
    title: item.title,
    category: item.category,
    original: {
      currency: item.currency,
      unit: item.unit,
      quantity: item.qty,
    },
    estimateCOP:
      item.currency === "COP"
        ? item.unit * item.qty
        : item.currency === "USD"
          ? Math.round(item.unit * item.qty * Number(dump.budgetState.fx?.USD ?? dump.liveFx.USD))
          : item.currency === "JPY"
            ? Math.round(item.unit * item.qty * Number(dump.budgetState.fx?.JPY ?? dump.liveFx.JPY))
            : 0,
    reservationStatus: item.statusText,
    reservationCode: item.status,
    opens: item.open,
    note: item.note ?? "",
    link: item.url ?? "",
  }));

  const purchases = (dump.budgetState.purchases ?? []).map((purchase) => ({
    id: purchase.id,
    name: purchase.title,
    category: purchase.category,
    activityId: purchase.refId || null,
    city: purchase.city || "General",
    provider: purchase.vendor || "",
    originalAmount: purchase.originalAmount || 0,
    currency: purchase.currency || "COP",
    amountCOP: purchase.amountCOP || 0,
    date: purchase.date || "",
    confirmationNumber: purchase.confirmation || "",
    status: "Pagado",
    notes: purchase.notes || "",
    link: "",
    receipt: {
      url: "",
      driveUrl: "",
      fileName: (purchase.receiptNames ?? [])[0] ?? "",
      storagePath: "",
    },
  }));

  const reservations = costs
    .filter((cost) => cost.activityId || cost.link || cost.reservationStatus)
    .map((cost) => {
      const activity = activities.find((item) => item.id === cost.activityId);
      const day = activity ? days.find((item) => item.id === activity.dayId) : null;
      return {
        id: `res-${cost.id}`,
        activityId: cost.activityId,
        travelDate: day?.date ?? cost.date,
        name: cost.title,
        currentStatus: cost.reservationStatus,
        opens: cost.opens,
        estimatedPriceCOP: cost.estimateCOP,
        link: cost.link,
        provider: cost.link.includes("klook")
          ? "Klook"
          : cost.link
            ? "Web oficial"
            : "",
        reminderNotes: cost.note,
      };
    });

  const library = (dump.base.library ?? []).map((item, index) => {
    const sourceId = addSource(item.source, item.id);
    return {
      id: item.id,
      order: index,
      start: item.start ?? "",
      end: item.end ?? "",
      title: item.title,
      place: item.place,
      kind: item.kind,
      lat: item.lat ?? null,
      lon: item.lon ?? null,
      bookingUrl: item.booking ?? "",
      googleMapsUrl: toGoogleMaps(item.place),
      legacyStatus: item.status ?? "",
      status: "fuera_del_viaje",
      note: item.note ?? "",
      priority: Boolean(item.priority),
      included: false,
      flexible: Boolean(item.flexible),
      fixed: Boolean(item.fixed),
      suggestedDate: item.suggestedDate ?? "",
      category: item.category ?? "extra",
      sourceIds: sourceId ? [sourceId] : [],
    };
  });

  const categories = Object.entries(dump.budgetState.categories ?? {}).map(([name, limitCOP]) => ({
    id: slug(name),
    name,
    limitCOP,
  }));

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: sourceStats,
    trip: {
      id: "japan-trip-2026-2027",
      name: "Japan Trip 2026-2027",
      displayName: "Japan Trip 2026–2027",
      travelers: 2,
      timezone: "Asia/Tokyo",
      startDate: days[0]?.date,
      endDate: days[days.length - 1]?.date,
      route: [
        "Bogota",
        "Mexico",
        "Vancouver",
        "Osaka",
        "Kyoto",
        "Hakone",
        "Tokyo",
        "Vancouver",
        "Montreal",
        "Bogota",
      ],
    },
    settings: {
      currencyBase: "COP",
      fx: {
        USD: Number(dump.budgetState.fx?.USD ?? dump.liveFx.USD),
        JPY: Number(dump.budgetState.fx?.JPY ?? dump.liveFx.JPY),
        updated: dump.budgetState.fx?.updated ?? dump.liveFx.updated,
      },
      authorizedUserEmails: [],
      offlineEnabled: true,
    },
    days,
    activities,
    hotels,
    purchases,
    reservations,
    costs,
    budget: {
      categories,
      hotelBudgets: dump.budgetState.hotels ?? dump.defaultBudget.hotels,
      notes: dump.manualChecks ?? [],
    },
    sources: [...sourceByUrl.values()],
    library,
    hotelRoutes,
    research: dump.base.research ?? [],
    decisions: dump.base.decisions ?? [],
    booked: dump.plan.booked ?? {},
    notes: dump.plan.notes ?? {},
    migrationReport: {
      baseDaysBeforeRuntimePatches: dump.base.days?.length ?? 0,
      finalDays: days.length,
      finalActivities: activities.length,
      libraryItems: library.length,
      costItems: costs.length,
      sourceEntries: sourceByUrl.size,
      activitySourceLinks: sourceActivities.length,
      knownIssues: [
        "BASE originally contains Japan-only dates; runtime v5/v6 patches add Bogota flights, final return, selected hotels, day routes, and church.",
        "The static HTML shell displays mojibake in some labels when read by PowerShell, but JavaScript data objects are extractable as UTF-8.",
        "The church activity title in v6 uses 'Ensenanza' without the Spanish ñ; the app may display a corrected label while preserving source text in notes.",
      ],
    },
  };
}

const html = readHtml(sourceFile);
const stats = fs.statSync(sourceFile);
const data = buildData(html, {
  fileName: path.basename(sourceFile),
  fullPath: sourceFile,
  bytes: stats.size,
  modifiedAt: stats.mtime.toISOString(),
});

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, `${JSON.stringify(data, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      outFile,
      days: data.days.length,
      activities: data.activities.length,
      hotels: data.hotels.length,
      purchases: data.purchases.length,
      costs: data.costs.length,
      sources: data.sources.length,
      library: data.library.length,
      firstDay: data.days[0]?.date,
      lastDay: data.days[data.days.length - 1]?.date,
    },
    null,
    2,
  ),
);
