import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Hotel as HotelIcon,
  LocateFixed,
  LogIn,
  LogOut,
  MapPin,
  Navigation,
  RotateCcw,
  SkipForward,
  WifiOff,
} from "lucide-react";
import type { Activity, TripDay, ZonePlace } from "../types";
import { activeActivitiesForDay, sortedDays } from "../utils/trip";
import { visualGroupForActivity, visualGroupForZonePlace } from "../utils/itineraryIntelligence";
import { useTravelCloud } from "./useTravelCloud";
import { useTravelProgress } from "./useTravelProgress";
import {
  activityCoordinates,
  appleMapsDirectionsUrl,
  distanceMeters,
  formatDistance,
  googleMapsDirectionsUrl,
  modeForActivity,
  type Coordinates,
} from "./navigation";
import "./travel.css";

function isoDateInTimezone(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function defaultDay(days: TripDay[], timezone: string) {
  const today = isoDateInTimezone(timezone);
  return (
    days.find((day) => day.date === today) ??
    days.find((day) => day.date > today) ??
    days[days.length - 1]
  );
}

function activityTime(activity: Activity) {
  if (activity.start) return activity.start;
  if (activity.mealSlot === "breakfast") return "Desayuno";
  if (activity.mealSlot === "lunch") return "Almuerzo";
  if (activity.mealSlot === "snack") return "Snack";
  if (activity.mealSlot === "dinner") return "Cena";
  return "Flexible";
}

function groupLabel(activity: Activity) {
  const group = visualGroupForActivity(activity);
  if (group === "shopping") return "Compras";
  if (group === "culture") return "Cultura / paseo";
  if (group === "food") return "Comida";
  if (group === "travel") return "Viaje";
  return "Actividad";
}

function gpsQuality(accuracy?: number) {
  if (accuracy == null) return "";
  if (accuracy <= 25) return `GPS preciso · ±${Math.round(accuracy)} m`;
  if (accuracy <= 75) return `GPS bueno · ±${Math.round(accuracy)} m`;
  return `GPS aproximado · ±${Math.round(accuracy)} m`;
}

function NearbyOption({
  place,
  distance,
}: {
  place: ZonePlace;
  distance: number;
}) {
  const destination =
    place.lat != null && place.lon != null
      ? { title: place.title, place: place.address, lat: place.lat, lon: place.lon }
      : { title: place.title, place: place.address, lat: null, lon: null };

  return (
    <article className={`nearbyCard visual-${visualGroupForZonePlace(place)}`}>
      <div>
        <span>{formatDistance(distance)} · {place.estimatedDurationMinutes ? `≈ ${place.estimatedDurationMinutes} min` : "flexible"}</span>
        <strong>{place.title}</strong>
        <small>{place.nearestStation || place.address}</small>
      </div>
      <a
        className="roundAction"
        href={googleMapsDirectionsUrl(destination, "walking")}
        target="_blank"
        rel="noreferrer"
        aria-label={`Ir a ${place.title}`}
      >
        <Navigation size={19} />
      </a>
    </article>
  );
}

export default function TravelApp() {
  const cloud = useTravelCloud();
  const progress = useTravelProgress();
  const days = useMemo(() => sortedDays(cloud.state), [cloud.state]);
  const [selectedDayId, setSelectedDayId] = useState("");
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [locationError, setLocationError] = useState("");
  const [tracking, setTracking] = useState(false);
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    if (!days.length || selectedDayId) return;
    setSelectedDayId(defaultDay(days, cloud.state.trip.timezone)?.id ?? days[0]?.id ?? "");
  }, [days, selectedDayId, cloud.state.trip.timezone]);

  useEffect(
    () => () => {
      if (watchRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchRef.current);
      }
    },
    [],
  );

  const selectedDay =
    days.find((day) => day.id === selectedDayId) ??
    defaultDay(days, cloud.state.trip.timezone) ??
    days[0];

  const activities = selectedDay
    ? activeActivitiesForDay(cloud.state, selectedDay.id)
    : [];

  const currentActivity =
    activities.find(
      (activity) =>
        !progress.completed.has(activity.id) &&
        !progress.skipped.has(activity.id),
    ) ?? null;

  const currentIndex = currentActivity
    ? activities.findIndex((activity) => activity.id === currentActivity.id)
    : -1;

  const upcoming = currentActivity
    ? activities
        .slice(currentIndex + 1)
        .filter(
          (activity) =>
            !progress.completed.has(activity.id) &&
            !progress.skipped.has(activity.id),
        )
        .slice(0, 5)
    : [];

  const completedCount = activities.filter((activity) =>
    progress.completed.has(activity.id),
  ).length;

  const hotel = selectedDay
    ? cloud.state.hotels.find((item) => item.id === selectedDay.hotelId && !item.archived)
    : null;

  const currentDistance = useMemo(() => {
    if (!position || !currentActivity) return null;
    const coordinates = activityCoordinates(currentActivity);
    return coordinates ? distanceMeters(position, coordinates) : null;
  }, [position, currentActivity]);

  const activeTitles = useMemo(
    () => new Set(activities.map((activity) => activity.title.trim().toLowerCase())),
    [activities],
  );

  const nearbyPlaces = useMemo(() => {
    if (!position || !selectedDay) return [];
    const zoneCity = new Map(cloud.state.zones.map((zone) => [zone.id, zone.city]));
    return cloud.state.zonePlaces
      .filter(
        (place) =>
          !place.selected &&
          place.lat != null &&
          place.lon != null &&
          !activeTitles.has(place.title.trim().toLowerCase()) &&
          String(zoneCity.get(place.zoneId) ?? "")
            .toLowerCase()
            .includes(selectedDay.city.split(" ")[0].toLowerCase()),
      )
      .map((place) => ({
        place,
        distance: distanceMeters(position, {
          lat: place.lat as number,
          lon: place.lon as number,
        }),
      }))
      .filter((entry) => entry.distance <= 1200)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 4);
  }, [position, selectedDay, cloud.state.zonePlaces, cloud.state.zones, activeTitles]);

  const startLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Este navegador no ofrece ubicación GPS.");
      return;
    }
    setLocationError("");
    setTracking(true);
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);

    watchRef.current = navigator.geolocation.watchPosition(
      (result) => {
        setPosition({
          lat: result.coords.latitude,
          lon: result.coords.longitude,
          accuracy: result.coords.accuracy,
        });
        setLocationError("");
      },
      (error) => {
        setTracking(false);
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? "Activa el permiso de ubicación para este sitio."
            : "No pude obtener tu ubicación. Intenta de nuevo al aire libre.",
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      },
    );
  };

  const dayIndex = selectedDay ? days.findIndex((day) => day.id === selectedDay.id) : -1;
  const moveDay = (delta: number) => {
    if (dayIndex < 0) return;
    const next = days[Math.min(days.length - 1, Math.max(0, dayIndex + delta))];
    if (next) setSelectedDayId(next.id);
  };

  if (cloud.configured && !cloud.user) {
    return (
      <main className="travelAuth">
        <section>
          <span className="eyebrow">Japan Trip · Modo Viaje</span>
          <h1>Tu itinerario de calle.</h1>
          <p>
            Esta versión lee el mismo viaje desde Firestore, pero no modifica la
            página de Planeación.
          </p>
          <button className="travelPrimary" type="button" onClick={cloud.signIn}>
            <LogIn size={20} />
            Entrar con Google
          </button>
        </section>
      </main>
    );
  }

  if (!selectedDay) {
    return (
      <main className="travelAuth">
        <section>
          <h1>No encontré días del viaje.</h1>
          <p>{cloud.message}</p>
        </section>
      </main>
    );
  }

  return (
    <div className="travelShell">
      <header className="travelTopbar">
        <div>
          <span className="eyebrow">Modo Viaje</span>
          <strong>{selectedDay.city}</strong>
        </div>
        <div className="topbarActions">
          {cloud.status === "offline" ? (
            <span className="offlineBadge"><WifiOff size={14} /> Offline</span>
          ) : (
            <span className="cloudBadge">{cloud.message}</span>
          )}
          <button className="iconGhost" type="button" onClick={cloud.signOut} aria-label="Salir">
            <LogOut size={17} />
          </button>
        </div>
      </header>

      <main className="travelMain">
        <section className="daySwitcher">
          <button
            type="button"
            onClick={() => moveDay(-1)}
            disabled={dayIndex <= 0}
            aria-label="Día anterior"
          >
            <ChevronLeft size={20} />
          </button>
          <label>
            <span>{selectedDay.label}</span>
            <select
              value={selectedDay.id}
              onChange={(event) => setSelectedDayId(event.target.value)}
            >
              {days.map((day) => (
                <option key={day.id} value={day.id}>
                  {day.label} · {day.city}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => moveDay(1)}
            disabled={dayIndex >= days.length - 1}
            aria-label="Día siguiente"
          >
            <ChevronRight size={20} />
          </button>
        </section>

        <section className="dayProgress">
          <div>
            <span>{completedCount} / {activities.length} completadas</span>
            <strong>{selectedDay.title}</strong>
          </div>
          <div className="progressTrack" aria-hidden="true">
            <span
              style={{
                width: activities.length
                  ? `${Math.round((completedCount / activities.length) * 100)}%`
                  : "0%",
              }}
            />
          </div>
        </section>

        {!tracking ? (
          <button className="locationPrompt" type="button" onClick={startLocation}>
            <LocateFixed size={22} />
            <span>
              <strong>Usar mi ubicación</strong>
              <small>Distancias reales y opciones cercanas</small>
            </span>
          </button>
        ) : position ? (
          <div className="locationStatus">
            <LocateFixed size={18} />
            <span>{gpsQuality(position.accuracy)}</span>
          </div>
        ) : (
          <div className="locationStatus">
            <LocateFixed size={18} />
            <span>Buscando GPS…</span>
          </div>
        )}
        {locationError ? <p className="locationError">{locationError}</p> : null}

        {currentActivity ? (
          <section className={`nowCard visual-${visualGroupForActivity(currentActivity)}`}>
            <div className="nowHeading">
              <span>▶ AHORA</span>
              <small>{groupLabel(currentActivity)}</small>
            </div>
            <div className="nowTime">
              <Clock3 size={17} />
              <strong>{activityTime(currentActivity)}</strong>
              {currentDistance != null ? (
                <span>{formatDistance(currentDistance)} de ti</span>
              ) : null}
            </div>
            <h1>{currentActivity.title}</h1>
            <p>
              <MapPin size={17} />
              {currentActivity.place || currentActivity.address}
            </p>
            {currentActivity.note ? <small className="nowNote">{currentActivity.note}</small> : null}

            <a
              className="goNow"
              href={googleMapsDirectionsUrl(currentActivity, modeForActivity(currentActivity))}
              target="_blank"
              rel="noreferrer"
            >
              <Navigation size={24} />
              IR AHORA
            </a>

            <div className="secondaryMaps">
              <a
                href={appleMapsDirectionsUrl(currentActivity, modeForActivity(currentActivity))}
                target="_blank"
                rel="noreferrer"
              >
                Apple Maps
              </a>
              {currentActivity.bookingUrl ? (
                <a href={currentActivity.bookingUrl} target="_blank" rel="noreferrer">
                  Reserva <ExternalLink size={14} />
                </a>
              ) : null}
            </div>

            <div className="streetActions">
              <button
                type="button"
                className={progress.arrived.has(currentActivity.id) ? "selected" : ""}
                onClick={() => progress.markArrived(currentActivity.id)}
              >
                <MapPin size={18} />
                Llegué
              </button>
              <button
                type="button"
                className="complete"
                onClick={() => progress.markCompleted(currentActivity.id)}
              >
                <Check size={18} />
                Hecho
              </button>
              <button type="button" onClick={() => progress.skip(currentActivity.id)}>
                <SkipForward size={18} />
                Saltar
              </button>
            </div>
          </section>
        ) : (
          <section className="finishedCard">
            <Check size={28} />
            <h2>Día completado</h2>
            <p>No quedan actividades activas por hacer.</p>
            <button
              type="button"
              onClick={() => progress.resetIds(activities.map((activity) => activity.id))}
            >
              <RotateCcw size={17} />
              Reiniciar progreso de este día
            </button>
          </section>
        )}

        {hotel ? (
          <section className="hotelQuick">
            <div>
              <span><HotelIcon size={17} /> Hotel</span>
              <strong>{hotel.name}</strong>
              <small>{hotel.address}</small>
            </div>
            <a
              href={googleMapsDirectionsUrl(hotel, "transit")}
              target="_blank"
              rel="noreferrer"
            >
              Volver al hotel
            </a>
          </section>
        ) : null}

        {upcoming.length ? (
          <section className="upcomingSection">
            <div className="sectionHeading">
              <span>DESPUÉS</span>
              <small>{upcoming.length} próximas</small>
            </div>
            <div className="upcomingList">
              {upcoming.map((activity) => {
                const coords = activityCoordinates(activity);
                const distance =
                  position && coords ? distanceMeters(position, coords) : null;
                return (
                  <article key={activity.id} className={`upcomingCard visual-${visualGroupForActivity(activity)}`}>
                    <time>{activityTime(activity)}</time>
                    <div>
                      <strong>{activity.title}</strong>
                      <small>
                        {groupLabel(activity)}
                        {distance != null ? ` · ${formatDistance(distance)}` : ""}
                      </small>
                    </div>
                    <a
                      href={googleMapsDirectionsUrl(activity, modeForActivity(activity))}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Ir a ${activity.title}`}
                    >
                      <Navigation size={18} />
                    </a>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        {nearbyPlaces.length ? (
          <section className="nearbySection">
            <div className="sectionHeading">
              <span>CERCA DE TI</span>
              <small>Opciones investigadas · no añadidas al plan</small>
            </div>
            <div className="nearbyList">
              {nearbyPlaces.map(({ place, distance }) => (
                <NearbyOption key={place.id} place={place} distance={distance} />
              ))}
            </div>
          </section>
        ) : null}

        {progress.skipped.size ? (
          <details className="skippedPanel">
            <summary>Saltadas durante el viaje ({progress.skipped.size})</summary>
            <div>
              {activities
                .filter((activity) => progress.skipped.has(activity.id))
                .map((activity) => (
                  <button
                    type="button"
                    key={activity.id}
                    onClick={() => progress.restore(activity.id)}
                  >
                    <RotateCcw size={15} />
                    Recuperar {activity.title}
                  </button>
                ))}
            </div>
          </details>
        ) : null}
      </main>

      <nav className="travelBottomNav" aria-label="Accesos rápidos">
        <button type="button" className="active">
          <Navigation size={20} />
          <span>Ahora</span>
        </button>
        <a href={`${import.meta.env.BASE_URL}`}>
          <Clock3 size={20} />
          <span>Planeación</span>
        </a>
        {hotel ? (
          <a
            href={googleMapsDirectionsUrl(hotel, "transit")}
            target="_blank"
            rel="noreferrer"
          >
            <HotelIcon size={20} />
            <span>Hotel</span>
          </a>
        ) : null}
      </nav>
    </div>
  );
}
