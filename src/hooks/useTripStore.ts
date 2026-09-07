import { useCallback, useEffect, useMemo, useState } from "react";
import initialTrip from "../data/initialTrip.json";
import type {
  Activity,
  BudgetCategory,
  Hotel,
  LibraryItem,
  Purchase,
  Reservation,
  SourceLink,
  TripState,
  ZonePlace,
} from "../types";
import { libraryToActivity, normalizeOrders } from "../utils/trip";
import { migrateStoredState, normalizeActivityV7 } from "../utils/migration";
import { rebalanceOsakaYearEnd } from "../utils/osakaRebalance";
import { enrichTokyoJan8 } from "../utils/tokyoJan8Enrichment";
import { applyBookedHotels2026 } from "../utils/bookedHotels2026";
import { applyCurrentItinerary2027 } from "../utils/currentItinerary2027";
import { syncMoneyPage } from "../utils/money";

const STORAGE_KEY = "japan-trip-2026-2027-state-v1";

function cleanState(state: TripState): TripState {
  return normalizeOrders(syncMoneyPage(state));
}

// Runtime patches must never re-apply itinerary recommendations that can overwrite
// choices made by the user. Osaka rebalance is therefore only used for a brand-new
// initial state, not for localStorage/Firestore states.
function withRuntimeEnrichment(state: TripState): TripState {
  return cleanState(
    applyCurrentItinerary2027(
      applyBookedHotels2026(enrichTokyoJan8(state)),
    ),
  );
}

function loadInitialState(): TripState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return withRuntimeEnrichment(migrateStoredState(JSON.parse(saved) as TripState));
  } catch (error) {
    console.warn("Could not load local trip state", error);
  }
  return withRuntimeEnrichment(rebalanceOsakaYearEnd(structuredClone(initialTrip as TripState)));
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function matchingZonePlace(draft: TripState, activity: Activity) {
  if (!activity.zoneId) return undefined;
  return draft.zonePlaces.find(
    (place) =>
      place.zoneId === activity.zoneId &&
      place.title.trim().toLowerCase() === activity.title.trim().toLowerCase(),
  );
}

function findMaterializedActivity(draft: TripState, place: ZonePlace) {
  const canonicalId = `zone-activity-${place.id}`;
  return draft.activities.find(
    (activity) =>
      activity.id === canonicalId ||
      activity.id === `jan8-suggestion-${place.id}` ||
      (activity.zoneId === place.zoneId &&
        activity.title.trim().toLowerCase() === place.title.trim().toLowerCase()),
  );
}

function materializeZonePlace(draft: TripState, place: ZonePlace, dayId: string, selected: boolean) {
  const storedPlace = draft.zonePlaces.find((item) => item.id === place.id);
  if (storedPlace) {
    storedPlace.selected = selected;
    storedPlace.suggestedDayId = dayId;
  }

  let activity = findMaterializedActivity(draft, place);
  if (!selected) {
    if (activity) activity.included = false;
    return;
  }

  const nextOrder = draft.activities.filter((item) => item.dayId === dayId && item.included).length;
  if (activity) {
    activity.dayId = dayId;
    activity.included = true;
    activity.order = nextOrder;
    activity.zoneId = place.zoneId;
    activity.place = activity.place || place.address || place.title;
    activity.lat = activity.lat ?? place.lat;
    activity.lon = activity.lon ?? place.lon;
    return;
  }

  activity = normalizeActivityV7({
    id: `zone-activity-${place.id}`,
    dayId,
    order: nextOrder,
    start: "",
    end: "",
    durationMinutes: place.estimatedDurationMinutes,
    title: place.title,
    place: place.address || place.title,
    kind: place.category,
    lat: place.lat,
    lon: place.lon,
    bookingUrl: place.reservationRequired ? place.officialUrl : "",
    googleMapsUrl: place.googleMapsUrl,
    legacyStatus: "Seleccionada",
    status: "idea",
    note: place.holidayNote || "",
    priority: place.priorityRank === "essential",
    included: true,
    flexible: true,
    fixed: false,
    sourceIds: place.sourceIds,
    description: place.description,
    zoneId: place.zoneId,
    displayMode: "flex-list",
    category: place.category,
    subCategory: place.subCategory,
    priorityRank: place.priorityRank,
    priceScope: place.priceScope,
    priceLabel: place.priceLabel,
    priceOriginal: place.priceOriginal,
    address: place.address || place.title,
    nearestStation: place.nearestStation,
    openingHours: place.openingHours,
    holidayNote: place.holidayNote,
    reservationRequired: place.reservationRequired,
    bookingLabel: place.reservationRequired ? "Ver / reservar" : "",
    routeStrategy: "ordered",
  });
  draft.activities.push(activity);
}

export function useTripStore() {
  const [state, setState] = useState<TripState>(loadInitialState);
  const [dirtySince, setDirtySince] = useState<Date | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const replaceState = useCallback((next: TripState) => {
    setState(withRuntimeEnrichment(next));
    setDirtySince(null);
  }, []);

  const mutate = useCallback((recipe: (draft: TripState) => void) => {
    setState((current) => {
      const draft = structuredClone(current);
      recipe(draft);
      setDirtySince(new Date());
      return cleanState(draft);
    });
  }, []);

  const updateActivity = useCallback(
    (activity: Activity) =>
      mutate((draft) => {
        const current = draft.activities.find((item) => item.id === activity.id);
        if (!current) return;
        const inclusionChanged = current.included !== activity.included;
        const next = { ...activity };
        if (inclusionChanged && next.included) {
          next.order = draft.activities.filter(
            (item) => item.dayId === next.dayId && item.included && item.id !== next.id,
          ).length;
        }
        draft.activities = draft.activities.map((item) => (item.id === activity.id ? next : item));
        const place = matchingZonePlace(draft, next);
        if (place && inclusionChanged) place.selected = next.included;
      }),
    [mutate],
  );

  const addActivity = useCallback(
    (dayId: string, activity?: Partial<Activity>) =>
      mutate((draft) => {
        const order = draft.activities.filter((item) => item.dayId === dayId && item.included).length;
        draft.activities.push(normalizeActivityV7({
          ...activity,
          id: activity?.id ?? uid("act"),
          dayId,
          order,
          title: activity?.title ?? "Nueva actividad",
        }));
      }),
    [mutate],
  );

  const deleteActivity = useCallback(
    (activityId: string) =>
      mutate((draft) => {
        const activity = draft.activities.find((item) => item.id === activityId);
        if (activity) {
          const place = matchingZonePlace(draft, activity);
          if (place) place.selected = false;
        }
        draft.activities = draft.activities.filter((item) => item.id !== activityId);
        draft.reservations = draft.reservations.map((reservation) =>
          reservation.activityId === activityId ? { ...reservation, activityId: null } : reservation,
        );
        draft.purchases = draft.purchases.map((purchase) =>
          purchase.activityId === activityId ? { ...purchase, activityId: null } : purchase,
        );
      }),
    [mutate],
  );

  const moveActivity = useCallback(
    (activityId: string, dayId: string, order?: number) =>
      mutate((draft) => {
        const activity = draft.activities.find((item) => item.id === activityId);
        if (!activity) return;
        activity.dayId = dayId;
        activity.order =
          order ??
          draft.activities.filter((item) => item.dayId === dayId && item.included && item.id !== activityId).length;
        const place = matchingZonePlace(draft, activity);
        if (place) place.suggestedDayId = dayId;
      }),
    [mutate],
  );

  const reorderActivity = useCallback(
    (dayId: string, activeId: string, overId: string) =>
      mutate((draft) => {
        const included = draft.activities
          .filter((activity) => activity.dayId === dayId && activity.included)
          .sort((a, b) => a.order - b.order);
        const activeIndex = included.findIndex((activity) => activity.id === activeId);
        const overIndex = included.findIndex((activity) => activity.id === overId);
        if (activeIndex < 0 || overIndex < 0) return;
        const [active] = included.splice(activeIndex, 1);
        included.splice(overIndex, 0, active);
        included.forEach((activity, index) => {
          const target = draft.activities.find((item) => item.id === activity.id);
          if (target) target.order = index;
        });
      }),
    [mutate],
  );

  const updateHotel = useCallback(
    (hotel: Hotel) =>
      mutate((draft) => {
        draft.hotels = draft.hotels.map((item) => (item.id === hotel.id ? hotel : item));
      }),
    [mutate],
  );

  const updateCategory = useCallback(
    (category: BudgetCategory) =>
      mutate((draft) => {
        draft.budget.categories = draft.budget.categories.map((item) =>
          item.id === category.id ? category : item,
        );
      }),
    [mutate],
  );

  const updateFx = useCallback(
    (currency: "USD" | "JPY", value: number) =>
      mutate((draft) => {
        draft.settings.fx[currency] = value;
        draft.settings.fx.updated = new Date().toISOString().slice(0, 10);
      }),
    [mutate],
  );

  const savePurchase = useCallback(
    (purchase: Purchase) =>
      mutate((draft) => {
        const exists = draft.purchases.some((item) => item.id === purchase.id);
        draft.purchases = exists
          ? draft.purchases.map((item) => (item.id === purchase.id ? purchase : item))
          : [...draft.purchases, purchase];
      }),
    [mutate],
  );

  const deletePurchase = useCallback(
    (purchaseId: string) =>
      mutate((draft) => {
        draft.purchases = draft.purchases.filter((purchase) => purchase.id !== purchaseId);
      }),
    [mutate],
  );

  const saveReservation = useCallback(
    (reservation: Reservation) =>
      mutate((draft) => {
        const exists = draft.reservations.some((item) => item.id === reservation.id);
        draft.reservations = exists
          ? draft.reservations.map((item) => (item.id === reservation.id ? reservation : item))
          : [...draft.reservations, reservation];
      }),
    [mutate],
  );

  const updateLibraryItem = useCallback(
    (item: LibraryItem) =>
      mutate((draft) => {
        draft.library = draft.library.map((entry) => (entry.id === item.id ? item : entry));
      }),
    [mutate],
  );

  const addLibraryToItinerary = useCallback(
    (libraryItemId: string, dayId: string) =>
      mutate((draft) => {
        const item = draft.library.find((entry) => entry.id === libraryItemId);
        if (!item) return;
        const order = draft.activities.filter((activity) => activity.dayId === dayId && activity.included).length;
        draft.activities.push(libraryToActivity(item, dayId, order));
        item.status = "anadido_al_viaje";
      }),
    [mutate],
  );

  const updateZonePlace = useCallback(
    (place: ZonePlace) =>
      mutate((draft) => {
        const dayId = place.suggestedDayId ?? draft.days.find((day) => day.zoneIds?.includes(place.zoneId))?.id;
        if (!dayId) {
          draft.zonePlaces = draft.zonePlaces.map((item) => (item.id === place.id ? place : item));
          return;
        }
        materializeZonePlace(draft, place, dayId, place.selected);
      }),
    [mutate],
  );

  const updateDocument = useCallback(
    (document: TripState["documents"][number]) =>
      mutate((draft) => {
        draft.documents = draft.documents.map((item) => (item.id === document.id ? document : item));
      }),
    [mutate],
  );

  const selectRecommendedZonePlaces = useCallback(
    (dayId: string, zoneIds: string[]) =>
      mutate((draft) => {
        draft.zonePlaces
          .filter((place) => zoneIds.includes(place.zoneId) && place.suggestedDayId === dayId)
          .forEach((place) => {
            const selected = place.priorityRank === "essential" || place.priorityRank === "recommended";
            materializeZonePlace(draft, place, dayId, selected);
          });
      }),
    [mutate],
  );

  const clearZonePlaces = useCallback(
    (dayId: string, zoneIds: string[]) =>
      mutate((draft) => {
        draft.zonePlaces
          .filter((place) => zoneIds.includes(place.zoneId) && place.suggestedDayId === dayId)
          .forEach((place) => materializeZonePlace(draft, place, dayId, false));
      }),
    [mutate],
  );

  const saveSource = useCallback(
    (source: SourceLink) =>
      mutate((draft) => {
        const exists = draft.sources.some((item) => item.id === source.id);
        draft.sources = exists
          ? draft.sources.map((item) => (item.id === source.id ? source : item))
          : [...draft.sources, source];
      }),
    [mutate],
  );

  const importBackup = useCallback((backup: TripState) => {
    replaceState(backup);
    setDirtySince(new Date());
  }, [replaceState]);

  const exportBackup = useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Japan-Trip-2026-2027-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [state]);

  const resetToInitial = useCallback(() => {
    replaceState(cleanState(rebalanceOsakaYearEnd(structuredClone(initialTrip as TripState))));
    setDirtySince(new Date());
  }, [replaceState]);

  const api = useMemo(
    () => ({
      state,
      dirtySince,
      replaceState,
      mutate,
      updateActivity,
      addActivity,
      deleteActivity,
      moveActivity,
      reorderActivity,
      updateHotel,
      updateCategory,
      updateFx,
      savePurchase,
      deletePurchase,
      saveReservation,
      updateLibraryItem,
      addLibraryToItinerary,
      updateZonePlace,
      updateDocument,
      selectRecommendedZonePlaces,
      clearZonePlaces,
      saveSource,
      importBackup,
      exportBackup,
      resetToInitial,
    }),
    [
      state,
      dirtySince,
      replaceState,
      mutate,
      updateActivity,
      addActivity,
      deleteActivity,
      moveActivity,
      reorderActivity,
      updateHotel,
      updateCategory,
      updateFx,
      savePurchase,
      deletePurchase,
      saveReservation,
      updateLibraryItem,
      addLibraryToItinerary,
      updateZonePlace,
      updateDocument,
      selectRecommendedZonePlaces,
      clearZonePlaces,
      saveSource,
      importBackup,
      exportBackup,
      resetToInitial,
    ],
  );

  return api;
}
