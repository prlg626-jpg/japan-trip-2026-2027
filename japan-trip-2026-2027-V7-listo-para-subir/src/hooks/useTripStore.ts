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
} from "../types";
import { libraryToActivity, normalizeOrders } from "../utils/trip";
import { migrateStoredState, normalizeActivityV7 } from "../utils/migration";

const STORAGE_KEY = "japan-trip-2026-2027-state-v1";

function cleanState(state: TripState): TripState {
  return normalizeOrders(state);
}

function loadInitialState(): TripState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return cleanState(migrateStoredState(JSON.parse(saved) as TripState));
  } catch (error) {
    console.warn("Could not load local trip state", error);
  }
  return cleanState(structuredClone(initialTrip as TripState));
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useTripStore() {
  const [state, setState] = useState<TripState>(loadInitialState);
  const [dirtySince, setDirtySince] = useState<Date | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const replaceState = useCallback((next: TripState) => {
    setState(cleanState(next));
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
        draft.activities = draft.activities.map((item) => (item.id === activity.id ? activity : item));
      }),
    [mutate],
  );

  const addActivity = useCallback(
    (dayId: string, activity?: Partial<Activity>) =>
      mutate((draft) => {
        const order = draft.activities.filter((item) => item.dayId === dayId).length;
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
        draft.activities = draft.activities.filter((activity) => activity.id !== activityId);
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
          draft.activities.filter((item) => item.dayId === dayId && item.id !== activityId).length;
      }),
    [mutate],
  );

  const reorderActivity = useCallback(
    (dayId: string, activeId: string, overId: string) =>
      mutate((draft) => {
        const dayActivities = draft.activities
          .filter((activity) => activity.dayId === dayId)
          .sort((a, b) => a.order - b.order);
        const activeIndex = dayActivities.findIndex((activity) => activity.id === activeId);
        const overIndex = dayActivities.findIndex((activity) => activity.id === overId);
        if (activeIndex < 0 || overIndex < 0) return;
        const [active] = dayActivities.splice(activeIndex, 1);
        dayActivities.splice(overIndex, 0, active);
        dayActivities.forEach((activity, index) => {
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
        const order = draft.activities.filter((activity) => activity.dayId === dayId).length;
        draft.activities.push(libraryToActivity(item, dayId, order));
        item.status = "anadido_al_viaje";
      }),
    [mutate],
  );

  const updateZonePlace = useCallback(
    (place: TripState["zonePlaces"][number]) =>
      mutate((draft) => {
        draft.zonePlaces = draft.zonePlaces.map((item) => (item.id === place.id ? place : item));
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
        draft.zonePlaces.forEach((place) => {
          if (zoneIds.includes(place.zoneId) && place.suggestedDayId === dayId) {
            place.selected = place.priorityRank === "essential" || place.priorityRank === "recommended";
          }
        });
      }),
    [mutate],
  );

  const clearZonePlaces = useCallback(
    (dayId: string, zoneIds: string[]) =>
      mutate((draft) => {
        draft.zonePlaces.forEach((place) => {
          if (zoneIds.includes(place.zoneId) && place.suggestedDayId === dayId) place.selected = false;
        });
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

  const importBackup = useCallback(
    (backup: TripState) => {
      replaceState(backup);
      setDirtySince(new Date());
    },
    [replaceState],
  );

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
    replaceState(cleanState(structuredClone(initialTrip as TripState)));
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
