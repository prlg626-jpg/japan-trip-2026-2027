import { useEffect, useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarDays,
  Check,
  Cloud,
  CloudOff,
  Coins,
  Download,
  Edit3,
  ExternalLink,
  GripVertical,
  Home,
  Library,
  LogIn,
  LogOut,
  Map as MapIcon,
  MapPin,
  MoreHorizontal,
  Navigation,
  Plus,
  Route,
  Upload,
} from "lucide-react";
import { ActivityEditor } from "./components/ActivityEditor";
import { HotelEditor } from "./components/HotelEditor";
import { HotelLinkCard } from "./components/HotelLinkCard";
import { ZoneExplorer } from "./components/ZoneExplorer";
import { RouteSummary } from "./components/RouteSummary";
import { RyokanComparison } from "./components/RyokanComparison";
import { DocumentsScreen } from "./components/DocumentsScreen";
import { MapView } from "./components/MapView";
import { OnTheGoScreen } from "./components/OnTheGoScreen";
import { blankPurchase, PurchaseEditor } from "./components/PurchaseEditor";
import { ReservationEditor } from "./components/ReservationEditor";
import { useFirebaseSync } from "./hooks/useFirebaseSync";
import { useTripStore } from "./hooks/useTripStore";
import type { Activity, Hotel, Purchase, Reservation, TripDay } from "./types";
import { activityEstimate, calculateBudget, formatCOP, formatMoney, hotelExpectedCOP } from "./utils/money";
import {
  candidateZonePlacesForDay,
  estimatedDayMinutes,
  visualGroupForActivity,
  type VisualGroup,
} from "./utils/itineraryIntelligence";
import { mealSlotLabel } from "./utils/mealSlots";
import { selectedBookableReservations } from "./utils/reservations";
import {
  activeActivitiesForDay,
  activitiesForDay,
  cityClass,
  countdownLabel,
  getHotelForDay,
  nextActivityForDay,
  nextTravelDay,
  sortedDays,
  statusLabel,
} from "./utils/trip";
import { buildDayRoute } from "./utils/route";
import { documentSummary } from "./utils/documents";
import { normalizeActivityV7 } from "./utils/migration";
import "./styles.css";

type Tab = "go" | "today" | "trip" | "map" | "money" | "more";

const navItems: Array<{ id: Tab; label: string; icon: typeof Home }> = [
  { id: "go", label: "En viaje", icon: Navigation },
  { id: "trip", label: "Viaje", icon: CalendarDays },
  { id: "map", label: "Mapa", icon: MapIcon },
  { id: "money", label: "Dinero", icon: Coins },
  { id: "more", label: "Más", icon: MoreHorizontal },
];

function emptyActivity(dayId: string, order: number): Activity {
  return normalizeActivityV7({
    id: `act-${Date.now()}`,
    dayId,
    order,
    title: "Nueva actividad",
    category: "experience",
    displayMode: "flex-list",
    priceScope: "unknown",
  });
}

function SyncPill({
  status,
  configured,
  message,
  verifiedAt,
}: {
  status: string;
  configured: boolean;
  message: string;
  verifiedAt?: string | null;
}) {
  const Icon = configured ? (status === "offline" ? CloudOff : Cloud) : CloudOff;
  const label = !configured
    ? "Local"
    : status === "syncing"
      ? "Guardando…"
      : status === "verified"
        ? "Nube verificada"
        : status === "online"
          ? "Online"
          : status === "offline"
            ? "Sin conexión"
            : "Revisar sync";
  return (
    <span className={`syncPill ${status}`}>
      <Icon size={15} />
      {label}
      {message ? <small>{message}</small> : null}
      {status === "verified" && verifiedAt ? (
        <small>
          Verificado {new Date(verifiedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </small>
      ) : null}
    </span>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className={`statCard ${tone ?? ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function reservationDurationMinutes(activity?: Activity) {
  if (!activity) return 0;
  const known =
    activity.estimatedDurationMinutes ??
    activity.recommendedVisitMinutes ??
    activity.durationMinutes;
  if (known && known > 0) return known;

  if (/^\d{2}:\d{2}$/.test(activity.start) && /^\d{2}:\d{2}$/.test(activity.end)) {
    const [startHour, startMinute] = activity.start.split(":").map(Number);
    const [endHour, endMinute] = activity.end.split(":").map(Number);
    const minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
    if (minutes > 0) return minutes;
  }

  return 0;
}

function compactDuration(minutes: number) {
  if (!minutes) return "";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `≈ ${rest} min`;
  return rest ? `≈ ${hours} h ${rest} min` : `≈ ${hours} h`;
}

function bookingCountdown(date?: string) {
  if (!date) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${date}T00:00:00`);
  const diff = Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
  if (diff < 0) return "Ya deberías revisarlo";
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  return `Faltan ${diff} días`;
}

function bookingUrgencyClass(date?: string, confidence?: Reservation["bookingConfidence"]) {
  if (confidence === "available") return "available";
  if (!date) return "unknown";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${date}T00:00:00`);
  const diff = Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
  if (diff <= 0) return "available";
  if (diff <= 7) return "soon";
  return "future";
}

const visualGroupLabels: Record<VisualGroup, string> = {
  activity: "Actividad",
  shopping: "Compras",
  culture: "Cultura / paseo",
  food: "Comida",
  travel: "Viaje",
};

function dayLoadLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `≈ ${remainder} min`;
  if (!remainder) return `≈ ${hours} h`;
  return `≈ ${hours} h ${remainder} min`;
}

function SortableActivityCard({
  activity,
  day,
  days,
  dayActivities,
  estimate,
  onEdit,
  onToggle,
  onComplete,
  onMove,
  onReorder,
  ordinal,
}: {
  activity: Activity;
  day: TripDay;
  days: TripDay[];
  dayActivities: Activity[];
  estimate: number;
  onEdit: (activity: Activity) => void;
  onToggle: (activity: Activity) => void;
  onComplete: (activity: Activity) => void;
  onMove: (activityId: string, dayId: string) => void;
  onReorder: (activityId: string, overId: string) => void;
  ordinal?: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: activity.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const mapsUrl = activity.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.place)}`;

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`activityCard category-${activity.category} visual-${visualGroupForActivity(activity)} ${activity.included ? "" : "inactive"} ${isDragging ? "dragging" : ""}`}
    >
      <button className="dragHandle" type="button" {...attributes} {...listeners} aria-label="Arrastrar">
        <GripVertical size={18} />
      </button>
      {activity.included && ordinal ? <span className="activityOrdinal">{ordinal}</span> : null}
      <div className="activityTime">
        <strong>{activity.start || (activity.displayMode === "flex-list" ? "Flexible" : "--:--")}</strong>
        <span>{activity.end || ""}</span>
      </div>
      <div className="activityMain">
        <div className="activityTitleRow">
          <div>
            <h4>{activity.title}</h4>
            <p>{activity.place}</p>
          </div>
          <button className="iconButton" type="button" onClick={() => onEdit(activity)} aria-label="Editar">
            <Edit3 size={17} />
          </button>
        </div>
        <div className="badgeRow">
          <span className={`statusBadge ${activity.status}`}>{statusLabel(activity.status)}</span>
          <span>{visualGroupLabels[visualGroupForActivity(activity)]}</span>
          {activity.mealSlot ? <span className="mealBadge">{mealSlotLabel(activity.mealSlot)}</span> : null}
          {activity.priority ? <span className="warm">prioridad</span> : null}
          {activity.fixed ? <span className="cool">fija</span> : null}
          {estimate > 0 ? <span>{formatCOP(estimate)}</span> : null}
        </div>
        {activity.description ? <p className="activityDescription">{activity.description}</p> : null}
        {activity.priceLabel ? <p className="priceScopeText">{activity.priceLabel}{activity.priceDynamic ? " · precio dinámico" : ""}</p> : null}
        {activity.holidayNote ? <p className="warningText">⚠ {activity.holidayNote}</p> : null}
        {activity.note && activity.note !== activity.description ? <p className="noteText">{activity.note}</p> : null}
        <div className="actionRow">
          <a className="chipButton" href={mapsUrl} target="_blank" rel="noreferrer">
            <MapPin size={15} />
            Maps
          </a>
          {activity.bookingUrl ? (
            <a className="chipButton" href={activity.bookingUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={15} />
              Reserva
            </a>
          ) : null}
          <button className="chipButton" type="button" onClick={() => onComplete(activity)}>
            <Check size={15} />
            Completar
          </button>
          <button className="chipButton" type="button" onClick={() => onToggle(activity)}>
            {activity.included ? "Desactivar" : "Activar"}
          </button>
        </div>
        <details className="moveMenu">
          <summary>Mover</summary>
          <div>
            <select value={activity.dayId} onChange={(event) => onMove(activity.id, event.target.value)}>
              {days.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.label} · {item.city}
                </option>
              ))}
            </select>
            <select onChange={(event) => event.target.value && onReorder(activity.id, event.target.value)} value="">
              <option value="">Orden en {day.label}</option>
              {dayActivities
                .filter((item) => item.id !== activity.id)
                .map((item) => (
                <option value={item.id} key={item.id}>
                  Antes de {item.start || item.title}
                </option>
                ))}
            </select>
          </div>
        </details>
      </div>
    </article>
  );
}

function ActivityCard({
  activity,
  estimate,
  onEdit,
}: {
  activity: Activity;
  estimate: number;
  onEdit: (activity: Activity) => void;
}) {
  const mapsUrl = activity.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.place)}`;
  return (
    <article className={`miniActivity visual-${visualGroupForActivity(activity)} ${activity.included ? "" : "inactive"}`}>
      <div>
        <time>{activity.start || "--:--"}</time>
        <h4>{activity.title}</h4>
        <p>{activity.place}</p>
      </div>
      <div className="miniActions">
        {estimate > 0 ? <span>{formatCOP(estimate)}</span> : null}
        <a href={mapsUrl} target="_blank" rel="noreferrer" aria-label="Maps">
          <MapPin size={16} />
        </a>
        <button type="button" onClick={() => onEdit(activity)} aria-label="Editar">
          <Edit3 size={16} />
        </button>
      </div>
    </article>
  );
}

function App() {
  const store = useTripStore();
  const { state } = store;
  const sync = useFirebaseSync(state, store.replaceState, store.loadedFromLocal);
  const days = useMemo(() => sortedDays(state), [state]);
  const initialDay = useMemo(() => nextTravelDay(state), [state]);
  const [tab, setTab] = useState<Tab>("go");
  const [selectedDayId, setSelectedDayId] = useState(initialDay.id);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [moreView, setMoreView] = useState<"home" | "documents" | "readiness">("home");

  useEffect(() => {
    if (selectedDayId !== "all" && !state.days.some((day) => day.id === selectedDayId)) {
      setSelectedDayId(days[0]?.id ?? "");
    }
  }, [days, selectedDayId, state.days]);

  const selectedDay = state.days.find((day) => day.id === selectedDayId) ?? days[0];
  const selectedActivities = selectedDay ? activitiesForDay(state, selectedDay.id) : [];
  const selectedActiveActivities = selectedActivities.filter((activity) => activity.included);
  const selectedHotel = selectedDay ? getHotelForDay(state, selectedDay.id) : null;
  const candidatePlaces = useMemo(
    () => (selectedDay ? candidateZonePlacesForDay(state, selectedDay.id) : []),
    [state, selectedDay],
  );
  const candidateZoneIds = new Set(candidatePlaces.map((place) => place.zoneId));
  const candidateZones = state.zones.filter((zone) => candidateZoneIds.has(zone.id));
  const selectedMapActivities = selectedActiveActivities;
  const dynamicRoute = selectedDay
    ? buildDayRoute(selectedDay.id, selectedHotel, selectedActiveActivities, [], state.routeSegments)
    : { points: [], segments: [] };
  const selectedDayLoad = selectedDay ? estimatedDayMinutes(state, selectedDay.id) : 0;
  const docSummary = documentSummary(state.documents);
  const dayDocuments = selectedDay ? state.documents.filter((doc) => doc.tripSegments.includes(selectedDay.id)) : [];
  const budget = useMemo(() => calculateBudget(state), [state]);
  const bookableReservations = useMemo(() => selectedBookableReservations(state), [state]);
  const reservationGroups = useMemo(() => {
    const grouped = new Map<string, Reservation[]>();
    bookableReservations.forEach((reservation) => {
      const list = grouped.get(reservation.travelDate) ?? [];
      list.push(reservation);
      grouped.set(reservation.travelDate, list);
    });

    return [...grouped.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, reservations]) => {
        const day = state.days.find((item) => item.id === date || item.date === date);
        const minutes = reservations.reduce((sum, reservation) => {
          const activity = state.activities.find((item) => item.id === reservation.activityId);
          return sum + reservationDurationMinutes(activity);
        }, 0);
        return { date, day, reservations, minutes };
      });
  }, [bookableReservations, state.activities, state.days]);
  const allMapActivities = state.activities.filter((activity) => activity.included);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !selectedDay) return;
    const current = activitiesForDay(state, selectedDay.id);
    const oldIndex = current.findIndex((activity) => activity.id === active.id);
    const newIndex = current.findIndex((activity) => activity.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const moved = arrayMove(current, oldIndex, newIndex);
    store.mutate((draft) => {
      moved.forEach((activity, index) => {
        const target = draft.activities.find((item) => item.id === activity.id);
        if (target) target.order = index;
      });
    });
  };

  const saveActivity = (activity: Activity, source?: Parameters<typeof store.saveSource>[0]) => {
    const isNew = !state.activities.some((item) => item.id === activity.id);
    if (source) store.saveSource(source);
    if (isNew) store.addActivity(activity.dayId, activity);
    else store.updateActivity(activity);
  };

  const importBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = JSON.parse(String(reader.result));
      store.importBackup(parsed);
    };
    reader.readAsText(file);
  };

  const todayDay = selectedDay ?? initialDay;
  const todayNext = nextActivityForDay(state, todayDay.id);
  const todayRemaining = activeActivitiesForDay(state, todayDay.id).filter((activity) =>
    todayNext ? activity.order >= todayNext.order : true,
  );
  const todayHotel = getHotelForDay(state, todayDay.id);

  if (sync.configured && !sync.user) {
    return (
      <main className="authGate">
        <section>
          <span>Japan Trip 2026–2027</span>
          <h1>Entra con Google para abrir el viaje.</h1>
          <p>
            El itinerario se sincroniza con Firestore y solo los usuarios autorizados pueden
            modificarlo.
          </p>
          <button className="primaryAction" type="button" onClick={sync.signIn}>
            <LogIn size={17} />
            Sign in with Google
          </button>
          <SyncPill status={sync.status} configured={sync.configured} message={sync.message} verifiedAt={sync.verifiedAt} />
        </section>
      </main>
    );
  }

  return (
    <div className="appShell">
      <aside className="sideNav">
        <div className="brandBlock">
          <span>JP</span>
          <strong>{state.trip.displayName}</strong>
        </div>
        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button className={tab === item.id ? "active" : ""} type="button" key={item.id} onClick={() => setTab(item.id)}>
                <Icon size={19} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <SyncPill status={sync.status} configured={sync.configured} message={sync.message} verifiedAt={sync.verifiedAt} />
      </aside>

      <main className="mainPane">
        <header className="topBar">
          <div>
            <p>{state.trip.route.join(" · ")}</p>
            <h1>{state.trip.displayName}</h1>
          </div>
          <div className="topActions">
            <SyncPill status={sync.status} configured={sync.configured} message={sync.message} verifiedAt={sync.verifiedAt} />
            {sync.configured ? (
              sync.user ? (
                <button className="ghost" type="button" onClick={sync.signOut}>
                  <LogOut size={16} />
                  Salir
                </button>
              ) : (
                <button className="primaryAction" type="button" onClick={sync.signIn}>
                  <LogIn size={16} />
                  Google
                </button>
              )
            ) : null}
          </div>
        </header>

        {tab === "go" ? <OnTheGoScreen state={state} onUpdate={store.updateActivity} onOpenPlan={(dayId) => { setSelectedDayId(dayId); setTab("trip"); }} onToday={(dayId) => { setSelectedDayId(dayId); setTab("today"); }} /> : null}

        {tab === "today" ? (
          <section className="screen todayScreen">
            <div className={`todayHero ${cityClass(todayDay.city)}`}>
              <div>
                <span>{todayDay.label}</span>
                <h2>{todayDay.city}</h2>
                <p>{todayDay.title}</p>
              </div>
              <select value={todayDay.id} onChange={(event) => setSelectedDayId(event.target.value)}>
                {days.map((day) => (
                  <option value={day.id} key={day.id}>
                    {day.label} · {day.city}
                  </option>
                ))}
              </select>
            </div>

            <div className="todayGrid">
              <article className="focusPanel category-hotel">
                <span>Hotel actual</span>
                <h3>{todayHotel?.name ?? "Sin hotel"}</h3>
                <p>{todayHotel?.address ?? "Pendiente por definir"}</p>
                {todayHotel?.quoteWarning ? <small className="warningText">⚠ {todayHotel.quoteWarning}</small> : null}
                {todayHotel ? (
                  <div className="actionRow">
                    {(todayHotel.klookUrl || todayHotel.link) ? <a href={todayHotel.klookUrl || todayHotel.link} target="_blank" rel="noreferrer" className="chipButton"><ExternalLink size={15} />Ver habitaciones y fotos</a> : null}
                    <button className="chipButton" type="button" onClick={() => setEditingHotel(todayHotel)}>Editar</button>
                  </div>
                ) : null}
              </article>

              <article className="focusPanel next">
                <span>Próxima actividad</span>
                <h3>{todayNext?.title ?? "Sin actividad"}</h3>
                <p>
                  {todayNext ? `${todayNext.start} · ${countdownLabel(todayNext.dayId, todayNext.start)}` : "Día libre"}
                </p>
                {todayNext ? (
                  <div className="actionRow">
                    <a className="chipButton" href={todayNext.googleMapsUrl} target="_blank" rel="noreferrer">
                      <MapPin size={15} />
                      Maps
                    </a>
                    {todayNext.bookingUrl ? (
                      <a className="chipButton" href={todayNext.bookingUrl} target="_blank" rel="noreferrer">
                        <ExternalLink size={15} />
                        Reserva
                      </a>
                    ) : null}
                    <button className="chipButton" type="button" onClick={() => setEditingActivity(todayNext)}>
                      <Edit3 size={15} />
                      Editar
                    </button>
                    <button
                      className="chipButton"
                      type="button"
                      onClick={() => store.updateActivity({ ...todayNext, status: "completada" })}
                    >
                      <Check size={15} />
                      Completar
                    </button>
                  </div>
                ) : null}
              </article>
            </div>

            <button className="documentSummaryCard" type="button" onClick={() => { setTab("more"); setMoreView("documents"); }}>
              <span>📄 Documentos de viaje</span><strong>{docSummary.ready} listos · {docSummary.pending} pendientes</strong><small>eTA, Visit Japan Web, pasaportes y seguro</small>
            </button>

            <div className="sectionTitle">
              <h3>Restante del día</h3>
              <button
                className="primaryAction"
                type="button"
                onClick={() => setEditingActivity(emptyActivity(todayDay.id, selectedActivities.length))}
              >
                <Plus size={16} />
                Añadir
              </button>
            </div>
            <div className="stack">
              {todayRemaining.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  estimate={activityEstimate(activity, state)}
                  onEdit={setEditingActivity}
                />
              ))}
            </div>
          </section>
        ) : null}

        {tab === "trip" ? (
          <section className="screen tripScreen">
            <div className="dayRail">
              {days.map((day) => (
                <button
                  key={day.id}
                  type="button"
                  className={`dayTile ${selectedDayId === day.id ? "active" : ""} ${cityClass(day.city)}`}
                  onClick={() => setSelectedDayId(day.id)}
                >
                  <span>{day.label}</span>
                  <strong>{day.city}</strong>
                  <small>
                    {activeActivitiesForDay(state, day.id).length} actividades · {dayLoadLabel(estimatedDayMinutes(state, day.id))}
                  </small>
                </button>
              ))}
            </div>

            {selectedDay ? (
              <div className="dayDetailGrid">
                <section className="timelinePanel">
                  <div className="dayHeader">
                    <div>
                      <span>{selectedDay.label}</span>
                      <h2>{selectedDay.title}</h2>
                      <p>{selectedDay.summary}</p>
                      <small className="dayLoadSummary">
                        Carga estimada: {dayLoadLabel(selectedDayLoad)}
                      </small>
                    </div>
                    <button
                      className="primaryAction"
                      type="button"
                      onClick={() => setEditingActivity(emptyActivity(selectedDay.id, selectedActivities.length))}
                    >
                      <Plus size={16} />
                      Actividad
                    </button>
                  </div>
                  {selectedHotel && !selectedHotel.archived ? <HotelLinkCard hotel={selectedHotel} onEdit={setEditingHotel} /> : null}
                  {dayDocuments.length ? <div className="dayDocuments">{dayDocuments.map((doc) => <span key={doc.id}>{["Aprobado","Completado"].includes(doc.status) ? "✅" : "⏳"} {doc.title} · {doc.travelerLabel}</span>)}</div> : null}
                  {selectedDay.why ? <div className="zoneWhy"><strong>Por qué esta zona</strong><p>{selectedDay.why}</p></div> : null}
                  <div className="visualLegend" aria-label="Leyenda de tipos">
                    <span className="visual-activity">Actividad</span>
                    <span className="visual-shopping">Compras</span>
                    <span className="visual-culture">Cultura / paseo</span>
                    <span className="visual-food">Comida</span>
                    <span className="visual-travel">Viaje</span>
                  </div>

                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={selectedActiveActivities.map((activity) => activity.id)} strategy={verticalListSortingStrategy}>
                      <div className="timelineStack">
                        {selectedActiveActivities.map((activity) => (
                          <SortableActivityCard
                            key={activity.id}
                            activity={activity}
                            day={selectedDay}
                            days={days}
                            dayActivities={selectedActiveActivities}
                            estimate={activityEstimate(activity, state)}
                            onEdit={setEditingActivity}
                            onToggle={(item) => store.updateActivity({ ...item, included: !item.included })}
                            onComplete={(item) => store.updateActivity({ ...item, status: "completada" })}
                            onMove={(activityId, dayId) => store.moveActivity(activityId, dayId)}
                            onReorder={(activityId, overId) => store.reorderActivity(selectedDay.id, activityId, overId)}
                            ordinal={activity.included ? selectedMapActivities.findIndex((item) => item.id === activity.id) + 1 : undefined}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>

                  <RouteSummary
                    segments={dynamicRoute.segments}
                    nameForId={(id) => state.activities.find((a) => a.id === id)?.title ?? state.zonePlaces.find((z) => z.id === id)?.title ?? state.hotels.find((h) => h.id === id)?.name ?? id}
                  />
                  <ZoneExplorer
                    zones={candidateZones}
                    places={candidatePlaces}
                    dayLabel={selectedDay.label}
                    onAdd={(place) => store.setZonePlaceForDay(place, selectedDay.id, true)}
                  />
                  {selectedDay.id === "2027-01-01" ? <RyokanComparison candidates={state.ryokanCandidates} /> : null}
                </section>
                <aside className="mapPanel">
                  <MapView
                    day={selectedDay}
                    activities={selectedMapActivities}
                    hotels={selectedHotel && !selectedHotel.archived ? [selectedHotel] : []}
                    zonePlaces={candidatePlaces}
                    routeSegments={dynamicRoute.segments}
                    height="100%"
                  />
                </aside>
              </div>
            ) : null}
          </section>
        ) : null}

        {tab === "map" ? (
          <section className="screen">
            <div className="sectionTitle">
              <div>
                <h2>Mapa general</h2>
                <p>Hoteles, actividades activas y recorridos por día.</p>
              </div>
              <select value={selectedDayId} onChange={(event) => setSelectedDayId(event.target.value)}>
                <option value="all">Todo el viaje</option>
                {days.map((day) => (
                  <option value={day.id} key={day.id}>
                    {day.label} · {day.city}
                  </option>
                ))}
              </select>
            </div>
            <MapView
              day={selectedDayId === "all" ? null : selectedDay}
              activities={selectedDayId === "all" ? allMapActivities : selectedActiveActivities}
              hotels={selectedDayId === "all" ? state.hotels.filter((hotel) => !hotel.archived) : selectedHotel && !selectedHotel.archived ? [selectedHotel] : []}
              zonePlaces={selectedDayId === "all" ? state.zonePlaces.filter((place) => place.selected) : candidatePlaces}
              routeSegments={selectedDayId === "all" ? [] : dynamicRoute.segments}
              height="70vh"
            />
          </section>
        ) : null}

        {tab === "money" ? (
          <section className="screen moneyScreen">
            <div className="kpiGrid">
              <StatCard label="Presupuesto total" value={formatCOP(budget.totalBudget)} />
              <StatCard label="Ya gastado" value={formatCOP(budget.paid)} tone="spent" />
              <StatCard label="Reservado no pagado" value={formatCOP(budget.committed)} tone="reserved" />
              <StatCard label="Pendiente estimado" value={formatCOP(budget.pending)} tone="pending" />
              <StatCard label="Disponible hoy" value={formatCOP(budget.availableToday)} tone="available" />
              <StatCard label="Saldo final" value={formatCOP(budget.afterPlanned)} tone={budget.afterPlanned < 0 ? "danger" : "available"} />
            </div>

            <div className="moneyGrid">
              <section className="panelCard">
                <div className="sectionTitle">
                  <h3>Límites</h3>
                  <div className="fxInputs">
                    <label>
                      USD
                      <input
                        type="number"
                        value={state.settings.fx.USD}
                        onChange={(event) => store.updateFx("USD", Number(event.target.value) || 0)}
                      />
                    </label>
                    <label>
                      JPY
                      <input
                        type="number"
                        value={state.settings.fx.JPY}
                        onChange={(event) => store.updateFx("JPY", Number(event.target.value) || 0)}
                      />
                    </label>
                  </div>
                </div>
                <div className="categoryList">
                  {state.budget.categories.map((category) => {
                    const id = category.id.toLowerCase();
                    const name = category.name.toLowerCase();
                    const isActivities = id.includes("activ") || name.includes("activ");
                    const isHotels = id.includes("hotel") || name.includes("hotel");
                    const calculated = isActivities || isHotels;
                    return (
                      <label key={category.id} className={calculated ? "calculatedBudget" : ""}>
                        <span>
                          {category.name}
                          {isActivities ? (
                            <small>Se actualiza con lo seleccionado en Viaje</small>
                          ) : isHotels ? (
                            <small>Se actualiza con los hoteles Pagados/Reservados en Compras y reservas</small>
                          ) : null}
                        </span>
                        <input
                          type="number"
                          step="10000"
                          value={category.limitCOP}
                          readOnly={calculated}
                          onChange={(event) => {
                            if (!calculated) {
                              store.updateCategory({ ...category, limitCOP: Number(event.target.value) || 0 });
                            }
                          }}
                        />
                      </label>
                    );
                  })}
                </div>
              </section>

              <section className="panelCard">
                <div className="sectionTitle">
                  <h3>Hoteles</h3>
                </div>
                <div className="cardList">
                  {state.hotels.filter((hotel) => !hotel.archived).map((hotel) => (
                    <article className="hotelCard" key={hotel.id}>
                      <div>
                        <s…5674 tokens truncated…solid var(--line);
  border-radius: 10px;
  background: white;
  cursor: pointer;
}

.miniActions span {
  white-space: nowrap;
  color: var(--green);
  font-size: 12px;
  font-weight: 850;
}

.dayRail {
  display: flex;
  gap: 9px;
  max-width: 100%;
  min-width: 0;
  overflow: auto;
  padding-bottom: 10px;
}

.dayTile {
  min-width: 138px;
  min-height: 118px;
  padding: 15px;
  border: 0;
  border-radius: 18px;
  color: white;
  text-align: left;
  cursor: pointer;
  opacity: 0.7;
}

.dayTile.active {
  opacity: 1;
  box-shadow: var(--shadow);
}

.dayTile strong,
.dayTile small {
  display: block;
}

.dayTile strong {
  margin: 10px 0 7px;
  font-size: 17px;
}

.dayTile small {
  color: rgba(255, 255, 255, 0.75);
}

.dayDetailGrid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
  margin-top: 8px;
  min-width: 0;
}

.timelinePanel {
  min-width: 0;
}

.dayHeader {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
  margin: 8px 0 14px;
}

.dayHeader h2 {
  margin: 6px 0 6px;
  font-size: clamp(26px, 7vw, 44px);
  line-height: 1;
}

.dayHeader p {
  max-width: 760px;
  margin: 0;
  color: var(--muted);
  line-height: 1.45;
}

.routeNote {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 11px;
  align-items: center;
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid #d7eadf;
  border-radius: 16px;
  background: #f2fbf6;
}

.routeNote span {
  display: block;
  margin-top: 3px;
  color: var(--muted);
  font-size: 12px;
}

.mapPanel {
  min-height: 480px;
  min-width: 0;
  position: sticky;
  top: 16px;
}

.mapCanvas {
  width: 100%;
  min-height: 320px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: #e9e1d6;
  box-shadow: var(--shadow);
}

.mapMarker {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 3px solid white;
  background: var(--violet);
  color: white;
  box-shadow: 0 5px 16px rgba(23, 21, 43, 0.25);
  font-size: 12px;
  font-weight: 900;
}

.mapMarker.hotel {
  border-radius: 10px;
  background: var(--ink);
}

.activityCard {
  grid-template-columns: auto 58px 1fr;
  padding: 12px;
  position: relative;
}

.activityCard.inactive,
.miniActivity.inactive {
  opacity: 0.48;
  border-style: dashed;
}

.activityCard.dragging {
  box-shadow: 0 24px 50px rgba(23, 21, 43, 0.16);
}

.dragHandle {
  align-self: stretch;
  width: 34px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fbfaf7;
  color: var(--muted);
  touch-action: none;
  cursor: grab;
}

.activityTime {
  padding-top: 6px;
}

.activityTime span {
  display: block;
  margin-top: 3px;
  color: var(--muted);
  font-size: 11px;
}

.activityTitleRow {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.badgeRow,
.actionRow {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 9px;
}

.badgeRow span {
  padding: 5px 8px;
  border-radius: 999px;
  background: #f1eee8;
  color: #665f53;
  font-size: 11px;
  font-weight: 800;
}

.statusBadge.idea {
  background: #eef3ff;
  color: #315c9c;
}

.statusBadge.pendiente_de_reservar {
  background: #fff2d8;
  color: #936004;
}

.statusBadge.reservada {
  background: #edf8f4;
  color: #147252;
}

.statusBadge.pagada,
.statusBadge.completada {
  background: #e7f8e7;
  color: #246f31;
}

.badgeRow .warm {
  background: #fff0ec;
  color: #a44532;
}

.badgeRow .cool {
  background: #ecebff;
  color: #4f44c3;
}

.noteText {
  margin-top: 9px !important;
}

.chipButton {
  min-height: 34px;
  padding: 7px 9px;
  font-size: 12px;
}

.moveMenu {
  margin-top: 8px;
}

.moveMenu summary {
  width: max-content;
  color: var(--muted);
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
}

.moveMenu div {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin-top: 8px;
}

.kpiGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.statCard {
  min-height: 112px;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: white;
  box-shadow: 0 10px 28px rgba(30, 22, 12, 0.05);
}

.statCard span {
  display: block;
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
}

.statCard strong {
  display: block;
  margin-top: 10px;
  font-size: clamp(21px, 5vw, 30px);
  line-height: 1;
}

.statCard.spent {
  background: #fff4f2;
}

.statCard.reserved {
  background: #fff9e8;
}

.statCard.pending {
  background: #f6f2ff;
}

.statCard.available {
  background: #effaf4;
}

.statCard.danger strong {
  color: var(--red);
}

.panelCard {
  min-width: 0;
}

.fxInputs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.fxInputs label {
  display: grid;
  gap: 4px;
  color: var(--muted);
  font-size: 11px;
  font-weight: 800;
}

.fxInputs input {
  width: 120px;
}

.categoryList label {
  display: grid;
  grid-template-columns: 1fr 140px;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: white;
}

.categoryList span {
  font-weight: 850;
}

.hotelCard,
.purchaseCard,
.reservationCard,
.libraryCard,
.sourceCard {
  display: grid;
  gap: 8px;
  padding: 15px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: white;
  box-shadow: 0 10px 28px rgba(30, 22, 12, 0.05);
}

.hotelCard strong,
.purchaseCard strong,
.reservationCard strong {
  font-size: 18px;
}

.hotelCard small,
.purchaseCard small,
.reservationCard small,
.libraryCard small {
  color: var(--muted);
  line-height: 1.4;
}

.purchaseGrid,
.reservationGrid,
.libraryGrid,
.sourceGrid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.usedList {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.usedList small {
  padding: 5px 7px;
  border-radius: 8px;
  background: #f1eee8;
  color: #635c50;
}

.backupGrid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.migrationNotes {
  margin-top: 10px;
  color: var(--muted);
}

.modalLayer {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: grid;
  place-items: end center;
  padding: 12px;
  background: rgba(15, 13, 24, 0.42);
}

.modalCard {
  width: min(820px, 100%);
  max-height: min(88vh, 900px);
  display: grid;
  grid-template-rows: auto 1fr auto;
  border-radius: 24px;
  background: var(--paper);
  box-shadow: 0 30px 90px rgba(10, 7, 20, 0.26);
  overflow: hidden;
}

.modalHeader,
.modalFooter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--line);
}

.modalHeader h2 {
  margin: 0;
}

.modalBody {
  overflow: auto;
  padding: 16px;
}

.modalFooter {
  justify-content: flex-end;
  border-top: 1px solid var(--line);
  border-bottom: 0;
}

.formGrid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 11px;
}

.formGrid label {
  display: grid;
  gap: 6px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 850;
}

.formGrid textarea {
  resize: vertical;
}

@media (max-width: 720px) {
  .topBar {
    display: block;
  }

  .topActions {
    margin-top: 10px;
  }

  .todayHero {
    display: grid;
    align-items: end;
    min-height: 260px;
  }

  .todayHero select {
    max-width: none;
  }

  .dayHeader {
    display: grid;
  }

  .activityCard {
    grid-template-columns: 34px 50px 1fr;
    padding: 10px;
  }

  .activityTitleRow .iconButton {
    width: 34px;
    height: 34px;
  }

  .categoryList label {
    grid-template-columns: 1fr;
  }

  .modalLayer {
    place-items: end center;
    padding: 0;
  }

  .modalCard {
    border-radius: 24px 24px 0 0;
    max-height: 92vh;
  }
}

@media (min-width: 760px) {
  .todayGrid,
  .moneyGrid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .kpiGrid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .purchaseGrid,
  .reservationGrid,
  .libraryGrid,
  .sourceGrid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .formGrid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .formGrid .full {
    grid-column: 1 / -1;
  }

  .moveMenu div {
    grid-template-columns: 1fr 1fr;
  }
}

@media (min-width: 1120px) {
  .appShell {
    display: grid;
    grid-template-columns: 236px minmax(0, 1fr);
  }

  .sideNav {
    position: sticky;
    top: 0;
    height: 100vh;
    display: flex;
    flex-direction: column;
    gap: 26px;
    padding: 24px 18px;
    border-right: 1px solid var(--line);
    background: rgba(255, 253, 250, 0.78);
    backdrop-filter: blur(20px);
  }

  .sideNav nav {
    display: grid;
    gap: 7px;
  }

  .sideNav button {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px;
    border-radius: 14px;
    font-weight: 850;
    text-align: left;
  }

  .sideNav button.active {
    background: var(--ink);
    color: white;
  }

  .sideNav .syncPill {
    margin-top: auto;
  }

  .mainPane {
    padding: 24px 26px 44px;
  }

  .topActions .syncPill {
    display: inline-flex;
  }

  .bottomNav {
    display: none;
  }

  .dayDetailGrid {
    grid-template-columns: minmax(0, 1.1fr) minmax(420px, 0.9fr);
    align-items: start;
  }

  .mapPanel {
    height: calc(100vh - 120px);
  }

  .kpiGrid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  .purchaseGrid,
  .reservationGrid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .moreGrid {
    grid-template-columns: 1.1fr 0.9fr;
  }

  .libraryGrid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}


/* Reservation agenda: vertical, grouped by travel day */
.reservationSectionTitle > div{display:grid;gap:3px}
.reservationSectionTitle p{margin:0;color:var(--muted);font-size:12px}
.reservationDayList{display:grid;gap:16px}
.reservationDayGroup{display:grid;gap:10px}
.reservationDayHeader{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 14px;border:1px solid var(--line);border-radius:17px;background:#f8f6f2}
.reservationDayHeader>div:first-child{display:grid;gap:2px}
.reservationDayHeader span{color:var(--muted);font-size:12px;font-weight:850}
.reservationDayHeader strong{font-size:16px}
.reservationLoad{display:grid;gap:2px;text-align:right}
.reservationLoad b{font-size:13px}
.reservationLoad small{color:var(--muted);font-size:10px}
.reservationDayItems{display:grid;gap:9px}
.reservationListCard{display:grid;grid-template-columns:34px minmax(0,1fr);gap:10px;padding:14px;border:1px solid var(--line);border-radius:18px;background:#fff;box-shadow:0 8px 22px rgba(30,22,12,.045)}
.reservationOrdinal{width:30px;height:30px;display:grid;place-items:center;border-radius:50%;background:#efecff;color:var(--violet);font-size:12px;font-weight:950}
.reservationListMain{min-width:0;display:grid;gap:9px}
.reservationTitleRow{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
.reservationTitleRow>div{min-width:0}
.reservationTitleRow h4{margin:0 0 4px;font-size:16px}
.reservationTitleRow p{margin:0;color:var(--muted);font-size:12px;line-height:1.4}
.reservationTitleRow>strong{flex:0 0 auto;font-size:14px;text-align:right}
.reservationMeta{display:flex;flex-wrap:wrap;gap:6px}
.reservationMeta span{padding:5px 7px;border-radius:999px;background:#f5f3ef;color:#5f5969;font-size:10px;font-weight:800}
.reservationNote{color:var(--muted);font-size:11px;line-height:1.45}
.emptyReservationState{padding:18px;border:1px dashed var(--line);border-radius:16px;color:var(--muted);text-align:center}
@media(max-width:620px){.reservationDayHeader{align-items:flex-start}.reservationTitleRow{display:grid}.reservationTitleRow>strong{text-align:left}.reservationListCard{grid-template-columns:30px minmax(0,1fr);padding:12px}}

.reservationLoad em{justify-self:end;padding:4px 7px;border-radius:999px;background:#fff0db;color:#965b00;font-size:9px;font-style:normal;font-weight:950;text-transform:uppercase;letter-spacing:.04em}


.bookingRelease{display:grid;gap:3px;padding:9px 11px;border-radius:14px;border:1px solid transparent}
.bookingRelease span{font-size:9px;font-weight:950;text-transform:uppercase;letter-spacing:.06em}
.bookingRelease b{font-size:13px;line-height:1.25}
.bookingRelease small{font-size:10px;font-weight:800}
.bookingRelease.future{background:#f2efff;border-color:#ddd5ff;color:#51449e}
.bookingRelease.soon{background:#fff3d8;border-color:#f4d59b;color:#9b5f00}
.bookingRelease.available{background:#e8f7ef;border-color:#bfe4cf;color:#276745}
.bookingRelease.unknown{background:#f4f3f1;border-color:#dedad4;color:#655f69}
.goScreen { max-width: 1120px; margin: 0 auto; }
.goHero { padding: 24px; border-radius: 24px; color: #fff; background: linear-gradient(130deg,#24203e,#44377c 70%,#346d75); }
.goEyebrow { display:flex; align-items:center; gap:8px; font-size:12px; font-weight:800; letter-spacing:.08em; }
.goEyebrow span { margin-left:auto; letter-spacing:0; font-weight:500; }
.goHero h2 { margin:18px 0 6px; font-size:clamp(30px,6vw,45px); line-height:1.1; }
.goHero p { margin:0 0 20px; color:#e3deef; }
.goDayLabel { display:grid; gap:7px; font-size:12px; }
.goDayLabel select { width:100%; min-height:48px; padding:10px 12px; border:1px solid #ffffff35; border-radius:12px; color:#fff; background:#ffffff15; }
.goDayLabel option { color:var(--ink); background:var(--paper); }
.goDayStatus { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:12px; font-size:12px; }
.goDayStatus button { border:0; background:transparent; color:#fff; text-decoration:underline; padding:8px 0; min-height:36px; }
.goMode { display:flex; gap:6px; padding:5px; margin-top:18px; background:#e8e3ed; border-radius:14px; }
.goMode button { display:flex; justify-content:center; align-items:center; gap:8px; flex:1; border:0; border-radius:10px; background:transparent; min-height:46px; padding:8px; font-weight:750; color:var(--muted); }
.goMode button[aria-pressed=true] { background:var(--paper); color:var(--ink); box-shadow:0 2px 8px #17152b15; }
.goHelp { font-size:12px; line-height:1.5; color:var(--muted); margin:12px 0; }
.goLayout { display:grid; gap:18px; align-items:start; }
.goMain { min-width:0; display:grid; gap:16px; }
.goFocus,.goEmpty,.goNext,.goHotel,.goTimeline { border:1px solid var(--line); background:var(--paper); border-radius:22px; padding:22px; min-width:0; }
.goFocus { border-top:4px solid var(--violet); box-shadow:var(--shadow); }
.goFocus.arrived { border-top-color:var(--teal); }
.goCardHeading { display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; font-size:11px; font-weight:800; color:var(--violet); }
.goCardHeading span:last-child { color:var(--muted); }
.goFocus h3 { font-size:clamp(25px,6vw,34px); line-height:1.18; margin:16px 0; overflow-wrap:anywhere; }
.goAddress { display:flex; align-items:flex-start; gap:8px; color:var(--muted); line-height:1.5; font-size:14px; }
.goAddress svg { flex-shrink:0; margin-top:2px; }
.goStation,.goBooking { font-size:13px; line-height:1.5; padding:12px; border-radius:12px; background:#f1eee7; }
.goNote { font-size:14px; line-height:1.65; white-space:pre-line; }
.goDirections { display:grid; gap:12px; margin-top:20px; }
.goDirections label { display:grid; gap:6px; font-size:12px; color:var(--muted); }
.goDirections select { min-height:48px; padding:10px; width:100%; border:1px solid var(--line); border-radius:12px; color:var(--ink); background:#fff; font-size:14px; text-overflow:ellipsis; }
.goNavigate { display:flex; align-items:center; justify-content:center; flex-wrap:wrap; gap:12px; padding:17px; border-radius:15px; background:var(--violet); color:#fff; font-size:21px; font-weight:800; text-decoration:none; min-height:80px; }
.goNavigate small { width:100%; text-align:center; font-weight:500; font-size:12px; opacity:.9; }
.goSavedRoute { font-size:13px; line-height:1.5; margin:0; }
.goActions { display:flex; flex-wrap:wrap; gap:9px; }
.goActions button { min-height:48px; display:flex; align-items:center; justify-content:center; gap:7px; flex:1; border-radius:12px; padding:12px; font-size:13px; font-weight:700; }
.goArrival { background:#f1eee7; border:1px solid var(--line); color:var(--ink); }
.goComplete { background:var(--teal); border:0; color:#fff; }
.goActions .goSkip { flex-basis:100%; min-height:42px; border:0; background:transparent; color:var(--muted); font-weight:500; }
.goBookingLink { display:flex; align-items:center; gap:8px; font-size:13px; padding:8px 0; margin-top:10px; }
.goNext > span,.goHotel span { font-size:11px; letter-spacing:.06em; color:var(--muted); font-weight:800; }
.goNext h3,.goHotel h3 { font-size:18px; margin:9px 0; }
.goNext p { color:var(--muted); font-size:13px; }
.goNext button,.goPlanLinks button,.goUndo { background:transparent; border:0; color:var(--violet); min-height:44px; padding:8px 0; font-size:13px; text-align:left; }
.goNext button,.goHotel a { display:flex; align-items:center; gap:8px; }
.goHotel { display:flex; gap:14px; align-items:flex-start; }
.goHotel > svg { flex-shrink:0; margin-top:3px; color:var(--teal); }
.goHotel a { font-size:13px; min-height:44px; }
.goTimelineHeader { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.goTimelineHeader h3 { margin:0; font-size:18px; }
.goTimelineHeader > span { color:var(--muted); font-size:11px; }
.goTimeline ol { list-style:none; padding:0; margin:18px 0; }
.goTimeline li { border-bottom:1px solid var(--line); }
.goTimeline li button { width:100%; display:flex; align-items:center; gap:12px; min-height:72px; padding:12px 3px; border:0; text-align:left; background:transparent; color:var(--ink); }
.goTimeline li button:disabled { color:var(--muted); opacity:.8; }
.goStep { display:grid; place-items:center; width:30px; height:30px; flex-shrink:0; border-radius:50%; background:#eee9e0; font-size:12px; }
.goTimeline strong { font-size:13px; line-height:1.4; display:block; }
.goTimeline small { display:block; font-size:11px; color:var(--muted); margin-top:5px; }
.goTimeline li.current .goStep { background:var(--violet); color:#fff; }
.goTimeline li.done .goStep { background:#dff3ec; color:var(--teal); }
.goPlanLinks { display:flex; justify-content:space-between; gap:12px; border-top:1px solid var(--line); margin-top:10px; padding-top:10px; }
.goEmpty { text-align:center; }
.goEmpty svg { color:var(--teal); }
.goEmpty p { color:var(--muted); line-height:1.5; }
@media (min-width: 900px) { .goLayout { grid-template-columns:minmax(0,1.35fr) minmax(300px,1fr); } .goTimeline { position:sticky; top:18px; } }
@media (max-width: 420px) { .goHero,.goFocus,.goEmpty,.goNext,.goHotel,.goTimeline { padding:18px; } .goCardHeading { flex-direction:column; gap:5px; } .goActions .goComplete { flex-basis:100%; } }
