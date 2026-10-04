import { useEffect, useState } from "react";
import { ArrowRight, Check, Clock, Hotel as HotelIcon, MapPin, Navigation, Route } from "lucide-react";
import type { Activity, TripState } from "../types";
import { activeActivitiesForDay, getHotelForDay, sortedDays } from "../utils/trip";
import { activityDestination, directionsUrl, isJapanDay, japanClock, travelDay, travelFocus, type RouteMode, type TravelMode } from "../utils/onTheGo";

type DayProgress = { focusId: string; arrivedId: string; skipped: string[]; previousStatuses?: Record<string, Activity["status"]> };
const PROGRESS_KEY = "japan-trip-on-the-go-progress-v1";
const emptyProgress: DayProgress = { focusId: "", arrivedId: "", skipped: [] };

export function OnTheGoScreen({ state, onUpdate, onOpenPlan, onToday }: {
  state: TripState;
  onUpdate: (activity: Activity) => void;
  onOpenPlan: (dayId: string) => void;
  onToday: (dayId: string) => void;
}) {
  const [now, setNow] = useState(() => new Date());
  const [dayOverride, setDayOverride] = useState("");
  const [mode, setMode] = useState<TravelMode>("activities");
  const [routeMode, setRouteMode] = useState<RouteMode>("transit");
  const [originType, setOriginType] = useState("current");
  const [progress, setProgress] = useState<Record<string, DayProgress>>(() => {
    try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}"); } catch { return {}; }
  });
  useEffect(() => {
    const update = () => setNow(new Date());
    const timer = window.setInterval(update, 30_000);
    document.addEventListener("visibilitychange", update);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", update); };
  }, []);
  useEffect(() => { try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch { /* Navigation remains usable when storage is unavailable. */ } }, [progress]);

  const days = sortedDays(state);
  const day = days.find((item) => item.id === dayOverride) ?? travelDay(days, now);
  if (!day) return <section className="screen goScreen"><h2>El viaje aún no tiene días.</h2></section>;
  const clock = japanClock(now);
  const isLive = day.date === clock.date;
  const activities = activeActivitiesForDay(state, day.id);
  const dayProgress = progress[day.id] ?? emptyProgress;
  const focus = travelFocus(activities, day, now, mode, dayProgress.focusId, dayProgress.skipped);
  const hotel = getHotelForDay(state, day.id);
  const completed = activities.filter((item) => item.status === "completada");
  const lastCompleted = [...completed].sort((a, b) => b.order - a.order)[0];
  const next = focus ? activities.find((item) => item.order > focus.order && item.status !== "completada" && !dayProgress.skipped.includes(item.id)) : null;
  const arrived = Boolean(focus && dayProgress.arrivedId === focus.id);
  const originActivity = originType === "previous" ? lastCompleted : undefined;
  const origin = originType === "hotel" && hotel ? hotel.address || `${hotel.name}, ${hotel.city}, Japan` : originActivity ? activityDestination(originActivity, day.city, hotel) : "";
  const destination = focus ? activityDestination(focus, day.city, hotel) : "";
  const exactRoute = state.routeSegments.find((segment) => segment.dayId === day.id && segment.toId === focus?.id && segment.fromId === (originType === "hotel" ? hotel?.id : originActivity?.id));
  const setDayProgress = (patch: Partial<DayProgress>) => setProgress((current) => ({ ...current, [day.id]: { ...(current[day.id] ?? emptyProgress), ...patch } }));
  const resetFocus = () => setDayProgress({ focusId: "", arrivedId: "" });
  const selectDay = (id: string) => { setDayOverride(id); setOriginType("current"); };

  return <section className="screen goScreen">
    <header className="goHero">
      <div className="goEyebrow"><Navigation size={18} /> EN VIAJE <span>{clock.time} · Japón</span></div>
      <h2>Un paso a la vez.</h2>
      <p>Tu parada, lo que sigue y cómo llegar.</p>
      <label className="goDayLabel">Día del viaje
        <select aria-label="Día del viaje" value={day.id} onChange={(event) => selectDay(event.target.value)}>{days.map((item) => <option key={item.id} value={item.id}>{item.label} · {item.city}</option>)}</select>
      </label>
      <div className="goDayStatus"><span>{isLive ? "Hoy" : "Vista previa"} · {day.city}</span><button type="button" onClick={() => { setDayOverride(""); resetFocus(); }}>Volver al día actual</button></div>
    </header>

    <div className="goMode" role="group" aria-label="Cómo seguir el itinerario">
      <button type="button" aria-pressed={mode === "activities"} onClick={() => { setMode("activities"); resetFocus(); }}><Route size={17} /> Por actividades</button>
      <button type="button" aria-pressed={mode === "clock"} onClick={() => { setMode("clock"); resetFocus(); }}><Clock size={17} /> Por hora</button>
    </div>
    <p className="goHelp">{mode === "clock" && isLive && isJapanDay(day) ? "La hora de Japón sugiere la parada; tú confirmas cuándo terminas." : mode === "clock" ? "En vista previa y en vuelos internacionales seguimos el orden guardado. Las horas de los vuelos son las del billete." : "Seguimos el orden de tu itinerario. Avanzas cuando tú decidas."}</p>

    <div className="goLayout"><div className="goMain">
      {focus ? <article className={`goFocus ${arrived ? "arrived" : ""}`} aria-label="Parada actual">
        <div className="goCardHeading"><span>{arrived ? "ESTÁS AQUÍ · LLEGADA CONFIRMADA" : "TU SIGUIENTE PARADA"}</span><span>{focus.start || "Sin hora fija"}{focus.flexible && !focus.fixed ? " · orientativa" : ""}</span></div>
        <h3>{focus.title}</h3>
        <p className="goAddress"><MapPin size={19} />{focus.address || focus.place || "Lugar por confirmar en el itinerario"}</p>
        {focus.nearestStation && <p className="goStation">Estación de referencia: <strong>{focus.nearestStation}</strong></p>}
        {focus.note && <p className="goNote">{focus.note}</p>}
        {focus.reservationRequired && <p className="goBooking">Revisa tu reserva y la hora de entrada.</p>}
        {!arrived && <div className="goDirections">
          <label>Salir desde<select aria-label="Salir desde" value={originType} onChange={(event) => setOriginType(event.target.value)}><option value="current">Mi ubicación actual en Google Maps</option>{hotel && <option value="hotel">{hotel.name}</option>}{lastCompleted && <option value="previous">Última actividad completada</option>}</select></label>
          <label>Cómo quieres ir<select aria-label="Cómo quieres ir" value={routeMode} onChange={(event) => setRouteMode(event.target.value as RouteMode)}><option value="transit">Metro / tren / bus</option><option value="walking">A pie</option></select></label>
          {exactRoute && <p className="goSavedRoute"><Route size={16} />Ruta guardada: {exactRoute.line}{exactRoute.minutes ? ` · aprox. ${exactRoute.minutes} min` : ""}. Confirma el trayecto actual en Maps.</p>}
          <a className="goNavigate" href={directionsUrl(destination, routeMode, origin)} target="_blank" rel="noopener noreferrer"><Navigation size={22} /> Ir ahora <ArrowRight size={20} /><small>Google Maps · {routeMode === "walking" ? "a pie" : "transporte público"}</small></a>
          <p className="goHelp">Maps te mostrará las líneas, los transbordos y las salidas disponibles. Al volver, tu parada sigue aquí.</p>
        </div>}
        <div className="goActions">
          {!arrived && <button className="goArrival" type="button" onClick={() => setDayProgress({ arrivedId: focus.id, focusId: focus.id })}><MapPin size={18} /> Llegué</button>}
          <button className="goComplete" type="button" onClick={() => { onUpdate({ ...focus, status: "completada" }); setDayProgress({ focusId: "", arrivedId: "", previousStatuses: { ...dayProgress.previousStatuses, [focus.id]: focus.status } }); }}><Check size={18} /> Ya terminé · siguiente</button>
          <button className="goSkip" type="button" onClick={() => setDayProgress({ skipped: [...dayProgress.skipped, focus.id], focusId: "", arrivedId: "" })}>Dejar para luego</button>
        </div>
        {focus.bookingUrl && <a className="goBookingLink" href={focus.bookingUrl} target="_blank" rel="noopener noreferrer">Abrir reserva / entrada <ArrowRight size={14} /></a>}
      </article> : <article className="goEmpty"><Check size={30} /><h3>{activities.length ? "Ya recorriste las paradas disponibles." : "Este día no tiene actividades incluidas."}</h3><p>{dayProgress.skipped.length ? "Dejaste algunas para después. Puedes retomarlas abajo." : "Consulta el plan del día o vuelve a tu hotel."}</p><button type="button" className="chipButton" onClick={() => onOpenPlan(day.id)}>Ver plan del día</button></article>}

      {next && <article className="goNext"><span>DESPUÉS</span><h3>{next.title}</h3><p>{next.start || "Flexible"} · {next.place}</p><button type="button" onClick={() => { setMode("activities"); setDayProgress({ focusId: next.id, arrivedId: "" }); }}>Ver esta parada <ArrowRight size={16} /></button></article>}
      {hotel && <article className="goHotel"><HotelIcon size={22} /><div><span>VOLVER AL HOTEL</span><h3>{hotel.name}</h3><a href={directionsUrl(hotel.address || `${hotel.name}, ${hotel.city}, Japan`, routeMode)} target="_blank" rel="noopener noreferrer">Ir al hotel con Google Maps <ArrowRight size={15} /></a></div></article>}
    </div>

    <aside className="goTimeline" aria-label="Recorrido del día"><div className="goTimelineHeader"><h3>Tu recorrido</h3><span>{completed.length}/{activities.length} completadas</span></div>
      <ol>{activities.map((item, index) => <li key={item.id} className={`${item.id === focus?.id ? "current" : ""} ${item.status === "completada" ? "done" : ""}`}><button type="button" disabled={item.status === "completada"} onClick={() => { setMode("activities"); setDayProgress({ focusId: item.id, arrivedId: "", skipped: dayProgress.skipped.filter((id) => id !== item.id) }); }}><span className="goStep">{item.status === "completada" ? <Check size={16} /> : index + 1}</span><span><strong>{item.title}</strong><small>{item.start || "Flexible"}{dayProgress.skipped.includes(item.id) ? " · para luego" : ""}{item.status === "completada" ? " · completada" : ""}</small></span></button></li>)}</ol>
      {dayProgress.skipped.length > 0 && <button type="button" className="chipButton" onClick={() => setDayProgress({ skipped: [], focusId: "", arrivedId: "" })}>Retomar las paradas pendientes</button>}
      {lastCompleted && dayProgress.previousStatuses?.[lastCompleted.id] && <button type="button" className="goUndo" onClick={() => { onUpdate({ ...lastCompleted, status: dayProgress.previousStatuses![lastCompleted.id] }); setDayProgress({ focusId: lastCompleted.id, arrivedId: "" }); }}>Deshacer última actividad completada</button>}
      <div className="goPlanLinks"><button type="button" onClick={() => onOpenPlan(day.id)}>Editar el plan del día</button><button type="button" onClick={() => onToday(day.id)}>Vista de hoy</button></div>
      <p className="goHelp">“Llegué” y “Dejar para luego” se recuerdan en este dispositivo. “Ya terminé” se guarda con el viaje sin quitar la actividad del itinerario.</p>
    </aside></div>
  </section>;
}
