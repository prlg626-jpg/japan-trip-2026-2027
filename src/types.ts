export type ActivityStatus =
  | "idea"
  | "pendiente_de_reservar"
  | "reservada"
  | "pagada"
  | "completada";

export type PurchaseStatus = "Idea" | "Por reservar" | "Reservado" | "Pagado" | "Cancelado";

export type LibraryStatus = "fuera_del_viaje" | "anadido_al_viaje" | "descartado";

export interface MoneyOriginal {
  currency: "COP" | "USD" | "JPY" | string;
  unit: number;
  quantity: number;
}

export interface TripMeta {
  id: string;
  name: string;
  displayName: string;
  travelers: number;
  timezone: string;
  startDate: string;
  endDate: string;
  route: string[];
}

export interface TripSettings {
  currencyBase: "COP";
  fx: {
    USD: number;
    JPY: number;
    updated: string;
  };
  authorizedUserEmails: string[];
  offlineEnabled: boolean;
}

export interface DayRoute {
  city: string;
  text: string;
  from: string;
  to: string;
  googleMapsUrl: string;
}

export interface TripDay {
  id: string;
  date: string;
  label: string;
  city: string;
  title: string;
  pace: string;
  summary: string;
  why: string;
  routeNote: string;
  hotelId: string | null;
  dayRoute: DayRoute | null;
  activityIds: string[];
}

export interface Activity {
  id: string;
  dayId: string;
  order: number;
  start: string;
  end: string;
  durationMinutes: number | null;
  title: string;
  place: string;
  kind: string;
  lat: number | null;
  lon: number | null;
  bookingUrl: string;
  googleMapsUrl: string;
  legacyStatus: string;
  status: ActivityStatus;
  note: string;
  priority: boolean;
  included: boolean;
  flexible: boolean;
  fixed: boolean;
  sourceIds: string[];
  costItemId: string | null;
  estimatedCostCOP: number | null;
  actualPaidCOP: number;
}

export interface Hotel {
  id: string;
  city: string;
  name: string;
  price: {
    amount: number;
    currency: string;
    amountCOP: number;
  };
  budgetCOP: number;
  nights: number;
  link: string;
  status: string;
  reservation: string;
  notes: string;
  address: string;
  lat: number | null;
  lon: number | null;
  paid: boolean;
}

export interface Purchase {
  id: string;
  name: string;
  category: string;
  activityId: string | null;
  city: string;
  provider: string;
  originalAmount: number;
  currency: string;
  amountCOP: number;
  date: string;
  confirmationNumber: string;
  status: PurchaseStatus;
  notes: string;
  link: string;
  receipt: {
    url: string;
    driveUrl: string;
    fileName: string;
    storagePath: string;
  };
}

export interface Reservation {
  id: string;
  activityId: string | null;
  travelDate: string;
  name: string;
  currentStatus: string;
  opens: string;
  estimatedPriceCOP: number;
  link: string;
  provider: string;
  reminderNotes: string;
}

export interface CostItem {
  id: string;
  activityId: string | null;
  date: string;
  title: string;
  category: string;
  original: MoneyOriginal;
  estimateCOP: number;
  reservationStatus: string;
  reservationCode: string;
  opens: string;
  note: string;
  link: string;
}

export interface BudgetCategory {
  id: string;
  name: string;
  limitCOP: number;
}

export interface Budget {
  categories: BudgetCategory[];
  hotelBudgets: Array<{ city: string; nights: number; budget: number }>;
  notes: Array<{ title: string; text: string }>;
}

export interface SourceLink {
  id: string;
  type: string;
  handle: string;
  url: string;
  note: string;
  used: string[];
  associatedActivityIds: string[];
}

export interface LibraryItem {
  id: string;
  order: number;
  start: string;
  end: string;
  title: string;
  place: string;
  kind: string;
  lat: number | null;
  lon: number | null;
  bookingUrl: string;
  googleMapsUrl: string;
  legacyStatus: string;
  status: LibraryStatus;
  note: string;
  priority: boolean;
  included: boolean;
  flexible: boolean;
  fixed: boolean;
  suggestedDate: string;
  category: string;
  sourceIds: string[];
}

export interface TripState {
  schemaVersion: number;
  generatedAt: string;
  source: {
    fileName: string;
    fullPath: string;
    bytes: number;
    modifiedAt: string;
  };
  trip: TripMeta;
  settings: TripSettings;
  days: TripDay[];
  activities: Activity[];
  hotels: Hotel[];
  purchases: Purchase[];
  reservations: Reservation[];
  costs: CostItem[];
  budget: Budget;
  sources: SourceLink[];
  library: LibraryItem[];
  hotelRoutes: Record<string, Array<{ name: string; km: string; time: string }>>;
  research: Array<{ title: string; why: string; url: string }>;
  decisions: string[];
  booked: Record<string, boolean>;
  notes: Record<string, string>;
  migrationReport: {
    baseDaysBeforeRuntimePatches: number;
    finalDays: number;
    finalActivities: number;
    libraryItems: number;
    costItems: number;
    sourceEntries: number;
    activitySourceLinks: number;
    knownIssues: string[];
  };
}
