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
  Map,
  MapPin,
  MoreHorizontal,
  Plus,
  Route,
  Upload,
} from "lucide-react";
import { ActivityEditor } from "./components/ActivityEditor";
import { HotelEditor } from "./components/HotelEditor";
import { MapView } from "./components/MapView";
import { blankPurchase, PurchaseEditor } from "./components/PurchaseEditor";
import { ReservationEditor } from "./components/ReservationEditor";
import { useFirebaseSync } from "./hooks/useFirebaseSync";
import { useTripStore } from "./hooks/useTripStore";
import type { Activity, Hotel, LibraryItem, Purchase, Reservation, TripDay } from "./types";
import { activityEstimate, calculateBudget, formatCOP, formatMoney, hotelExpectedCOP } from "./utils/money";
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
import "./styles.css";

type Tab = "today" | "trip" | "map" | "money" | "more";

const navItems: Array<{ id: Tab; label: string; icon: typeof Home }> = [
  { id: "today", label: "Hoy", icon: Home },
  { id: "trip", label: "Viaje", icon: CalendarDays },
  { id: "map", label: "Mapa", icon: Map },
  { id: "money", label: "Dinero", icon: Coins },
  { id: "more", label: "Más", icon: MoreHorizontal },
];

function emptyActivity(dayId: string, order: number): Activity {
  return {
    id: `act-${Date.now()}`,
    dayId,
    order,
    start: "",
    end: "",
    durationMinutes: null,
    title: "Nueva actividad",
    place: "",
    kind: "experience",
    lat: null,
    lon: null,
    bookingUrl: "",
    googleMapsUrl: "",
    legacyStatus: "",
    status: "idea",
    note: "",
    priority: false,
    included: true,
    flexible: true,
    fixed: false,
    sourceIds: [],
    costItemId: null,
    estimatedCostCOP: 0,
    actualPaidCOP: 0,
  };
}

function SyncPill({
  status,
  configured,
  message,
}: {
  status: string;
  configured: boolean;
  message: string;
}) {
  const Icon = configured ? (status === "offline" ? CloudOff : Cloud) : CloudOff;
  const label = !configured
    ? "Local"
    : status === "syncing"
      ? "Sincronizando"
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
      className={`activityCard ${activity.included ? "" : "inactive"} ${isDragging ? "dragging" : ""}`}
    >
      <button className="dragHandle" type="button" {...attributes} {...listeners} aria-label="Arrastrar">
        <GripVertical size={18} />
      </button>
      <div className="activityTime">
        <strong>{activity.start || "--:--"}</strong>
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
          <span>{activity.kind}</span>
          {activity.priority ? <span className="warm">prioridad</span> : null}
          {activity.fixed ? <span className="cool">fija</span> : null}
          {estimate > 0 ? <span>{formatCOP(estimate)}</span> : null}
        </div>
        {activity.note ? <p className="noteText">{activity.note}</p> : null}
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
    <article className={`miniActivity ${activity.included ? "" : "inactive"}`}>
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
  const sync = useFirebaseSync(state, store.replaceState);
  const days = useMemo(() => sortedDays(state), [state]);
  const initialDay = useMemo(() => nextTravelDay(state), [state]);
  const [tab, setTab] = useState<Tab>("today");
  const [selectedDayId, setSelectedDayId] = useState(initialDay.id);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [libraryFilter, setLibraryFilter] = useState("all");

  useEffect(() => {
    if (selectedDayId !== "all" && !state.days.some((day) => day.id === selectedDayId)) {
      setSelectedDayId(days[0]?.id ?? "");
    }
  }, [days, selectedDayId, state.days]);

  const selectedDay = state.days.find((day) => day.id === selectedDayId) ?? days[0];
  const selectedActivities = selectedDay ? activitiesForDay(state, selectedDay.id) : [];
  const selectedActiveActivities = selectedActivities.filter((activity) => activity.included);
  const selectedHotel = selectedDay ? getHotelForDay(state, selectedDay.id) : null;
  const budget = useMemo(() => calculateBudget(state), [state]);
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
          <SyncPill status={sync.status} configured={sync.configured} message={sync.message} />
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
        <SyncPill status={sync.status} configured={sync.configured} message={sync.message} />
      </aside>

      <main className="mainPane">
        <header className="topBar">
          <div>
            <p>{state.trip.route.join(" · ")}</p>
            <h1>{state.trip.displayName}</h1>
          </div>
          <div className="topActions">
            <SyncPill status={sync.status} configured={sync.configured} message={sync.message} />
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
              <article className="focusPanel">
                <span>Hotel actual</span>
                <h3>{todayHotel?.name ?? "Sin hotel"}</h3>
                <p>{todayHotel?.address ?? "Pendiente por definir"}</p>
                {todayHotel?.link ? (
                  <a href={todayHotel.link} target="_blank" rel="noreferrer" className="chipButton">
                    <ExternalLink size={15} />
                    Hotel
                  </a>
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
                  <small>{activeActivitiesForDay(state, day.id).length} actividades</small>
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
                  {selectedHotel ? (
                    <div className="routeNote">
                      <Route size={17} />
                      <div>
                        <strong>{selectedHotel.name}</strong>
                        <span>{selectedDay.dayRoute?.text ?? selectedDay.routeNote}</span>
                      </div>
                      {selectedDay.dayRoute?.googleMapsUrl ? (
                        <a href={selectedDay.dayRoute.googleMapsUrl} target="_blank" rel="noreferrer">
                          Maps
                        </a>
                      ) : null}
                    </div>
                  ) : null}

                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={selectedActivities.map((activity) => activity.id)} strategy={verticalListSortingStrategy}>
                      <div className="timelineStack">
                        {selectedActivities.map((activity) => (
                          <SortableActivityCard
                            key={activity.id}
                            activity={activity}
                            day={selectedDay}
                            days={days}
                            dayActivities={selectedActivities}
                            estimate={activityEstimate(activity, state)}
                            onEdit={setEditingActivity}
                            onToggle={(item) => store.updateActivity({ ...item, included: !item.included })}
                            onComplete={(item) => store.updateActivity({ ...item, status: "completada" })}
                            onMove={(activityId, dayId) => store.moveActivity(activityId, dayId)}
                            onReorder={(activityId, overId) => store.reorderActivity(selectedDay.id, activityId, overId)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </section>
                <aside className="mapPanel">
                  <MapView
                    day={selectedDay}
                    activities={selectedActiveActivities}
                    hotels={selectedHotel ? [selectedHotel] : []}
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
              hotels={selectedDayId === "all" ? state.hotels : selectedHotel ? [selectedHotel] : []}
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
                  {state.budget.categories.map((category) => (
                    <label key={category.id}>
                      <span>{category.name}</span>
                      <input
                        type="number"
                        step="10000"
                        value={category.limitCOP}
                        onChange={(event) => store.updateCategory({ ...category, limitCOP: Number(event.target.value) || 0 })}
                      />
                    </label>
                  ))}
                </div>
              </section>

              <section className="panelCard">
                <div className="sectionTitle">
                  <h3>Hoteles</h3>
                </div>
                <div className="cardList">
                  {state.hotels.map((hotel) => (
                    <article className="hotelCard" key={hotel.id}>
                      <div>
                        <span>{hotel.city} · {hotel.nights} noches</span>
                        <h4>{hotel.name}</h4>
                        <p>{hotel.status}</p>
                      </div>
                      <strong>{formatMoney(hotel.price.amount, hotel.price.currency)}</strong>
                      <small>{formatCOP(hotelExpectedCOP(hotel, state))}</small>
                      <button className="chipButton" type="button" onClick={() => setEditingHotel(hotel)}>
                        Editar
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            </div>

            <div className="sectionTitle">
              <h3>Compras y reservas</h3>
              <button className="primaryAction" type="button" onClick={() => setEditingPurchase(blankPurchase())}>
                <Plus size={16} />
                Compra
              </button>
            </div>
            <div className="purchaseGrid">
              {state.purchases.map((purchase) => (
                <article className={`purchaseCard ${purchase.status.toLowerCase()}`} key={purchase.id}>
                  <div>
                    <span>{purchase.category} · {purchase.city}</span>
                    <h4>{purchase.name}</h4>
                    <p>{purchase.provider}</p>
                  </div>
                  <strong>{formatCOP(purchase.amountCOP)}</strong>
                  <small>{purchase.status} · {purchase.date || "sin fecha"}</small>
                  <div className="actionRow">
                    {purchase.link ? (
                      <a className="chipButton" href={purchase.link} target="_blank" rel="noreferrer">
                        Link
                      </a>
                    ) : null}
                    {purchase.receipt.url || purchase.receipt.driveUrl ? (
                      <a className="chipButton" href={purchase.receipt.url || purchase.receipt.driveUrl} target="_blank" rel="noreferrer">
                        Comprobante
                      </a>
                    ) : null}
                    <button className="chipButton" type="button" onClick={() => setEditingPurchase(purchase)}>
                      Editar
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="sectionTitle">
              <h3>Qué ya se puede reservar</h3>
            </div>
            <div className="reservationGrid">
              {state.reservations.map((reservation) => (
                <article className="reservationCard" key={reservation.id}>
                  <span>{reservation.travelDate}</span>
                  <h4>{reservation.name}</h4>
                  <p>{reservation.currentStatus} · abre: {reservation.opens}</p>
                  <strong>{formatCOP(reservation.estimatedPriceCOP)}</strong>
                  <div className="actionRow">
                    {reservation.link ? (
                      <a className="chipButton" href={reservation.link} target="_blank" rel="noreferrer">
                        Abrir
                      </a>
                    ) : null}
                    <button className="chipButton" type="button" onClick={() => setEditingReservation(reservation)}>
                      Editar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {tab === "more" ? (
          <section className="screen moreScreen">
            <div className="moreGrid">
              <section className="panelCard">
                <div className="sectionTitle">
                  <h3>Biblioteca / Shoe Lab</h3>
                  <select value={libraryFilter} onChange={(event) => setLibraryFilter(event.target.value)}>
                    <option value="all">Todo</option>
                    <option value="calzado">Calzado / moda</option>
                    <option value="extra">Experiencias extra</option>
                    <option value="descartado">Descartado</option>
                  </select>
                </div>
                <div className="libraryGrid">
                  {state.library
                    .filter((item) => libraryFilter === "all" || item.category === libraryFilter || item.status === libraryFilter)
                    .map((item: LibraryItem) => (
                      <article className={`libraryCard ${item.status}`} key={item.id}>
                        <span>{item.category}</span>
                        <h4>{item.title}</h4>
                        <p>{item.place}</p>
                        <small>{item.note}</small>
                        <div className="actionRow">
                          <select defaultValue={item.suggestedDate || days[0]?.id} id={`day-${item.id}`}>
                            {days.map((day) => (
                              <option value={day.id} key={day.id}>
                                {day.label} · {day.city}
                              </option>
                            ))}
                          </select>
                          <button
                            className="chipButton"
                            type="button"
                            onClick={() => {
                              const select = document.getElementById(`day-${item.id}`) as HTMLSelectElement | null;
                              store.addLibraryToItinerary(item.id, select?.value ?? days[0].id);
                            }}
                          >
                            Añadir
                          </button>
                          <button className="chipButton" type="button" onClick={() => store.updateLibraryItem({ ...item, status: "descartado" })}>
                            Descartar
                          </button>
                        </div>
                      </article>
                    ))}
                </div>
              </section>

              <section className="panelCard">
                <div className="sectionTitle">
                  <h3>Inspiración</h3>
                </div>
                <div className="sourceGrid">
                  {state.sources.map((source) => (
                    <article className="sourceCard" key={source.id}>
                      <span>{source.type}</span>
                      <h4>{source.handle || "Fuente"}</h4>
                      <p>{source.note}</p>
                      <div className="usedList">
                        {source.associatedActivityIds.map((activityId) => {
                          const activity = state.activities.find((item) => item.id === activityId);
                          return activity ? <small key={activityId}>{activity.title}</small> : null;
                        })}
                      </div>
                      <a className="chipButton" href={source.url} target="_blank" rel="noreferrer">
                        Abrir publicación
                      </a>
                    </article>
                  ))}
                </div>
              </section>
            </div>

            <section className="panelCard">
              <div className="sectionTitle">
                <h3>Respaldo</h3>
                <div className="actionRow">
                  <button className="primaryAction" type="button" onClick={store.exportBackup}>
                    <Download size={16} />
                    Exportar respaldo
                  </button>
                  <label className="primaryAction fileButton">
                    <Upload size={16} />
                    Importar respaldo
                    <input
                      type="file"
                      accept=".json,application/json"
                      hidden
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) importBackup(file);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                  <button
                    className="ghost danger"
                    type="button"
                    onClick={() => {
                      if (window.confirm("¿Restaurar el JSON base migrado y borrar cambios locales?")) {
                        store.resetToInitial();
                      }
                    }}
                  >
                    Restaurar base
                  </button>
                </div>
              </div>
              <div className="backupGrid">
                <StatCard label="Días" value={String(state.days.length)} />
                <StatCard label="Actividades" value={String(state.activities.length)} />
                <StatCard label="Fuentes" value={String(state.sources.length)} />
                <StatCard label="Biblioteca" value={String(state.library.length)} />
              </div>
              <details className="migrationNotes">
                <summary>Notas de migración</summary>
                {state.migrationReport.knownIssues.map((issue) => (
                  <p key={issue}>{issue}</p>
                ))}
              </details>
            </section>
          </section>
        ) : null}
      </main>

      <nav className="bottomNav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button className={tab === item.id ? "active" : ""} type="button" key={item.id} onClick={() => setTab(item.id)}>
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <ActivityEditor
        open={Boolean(editingActivity)}
        activity={editingActivity}
        days={days}
        sources={state.sources}
        onClose={() => setEditingActivity(null)}
        onSave={saveActivity}
        onDelete={(activityId) => {
          store.deleteActivity(activityId);
          setEditingActivity(null);
        }}
      />
      <HotelEditor
        open={Boolean(editingHotel)}
        hotel={editingHotel}
        onClose={() => setEditingHotel(null)}
        onSave={store.updateHotel}
      />
      <PurchaseEditor
        open={Boolean(editingPurchase)}
        purchase={editingPurchase}
        activities={state.activities}
        onClose={() => setEditingPurchase(null)}
        onSave={store.savePurchase}
        onDelete={(purchaseId) => {
          store.deletePurchase(purchaseId);
          setEditingPurchase(null);
        }}
      />
      <ReservationEditor
        open={Boolean(editingReservation)}
        reservation={editingReservation}
        onClose={() => setEditingReservation(null)}
        onSave={store.saveReservation}
      />
    </div>
  );
}

export default App;
