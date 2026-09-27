import type { ActivityBlackBox, TripState } from "../types";

const LOCAL_BLACK_BOX_KEY = "japan-trip-2026-2027-activity-blackbox-v1";

export function captureActivityBlackBox(state: TripState): ActivityBlackBox {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    activityDecisions: Object.fromEntries(
      state.activities.map((activity) => [
        activity.id,
        {
          included: activity.included,
          dayId: activity.dayId,
          order: activity.order,
        },
      ]),
    ),
    // Full snapshots let us resurrect a selected/custom activity if a later code
    // migration accidentally removes it from the canonical itinerary.
    protectedActivities: state.activities
      .filter(
        (activity) =>
          activity.included ||
          activity.id.startsWith("act-") ||
          activity.id.startsWith("zone-activity-"),
      )
      .map((activity) => structuredClone(activity)),
    zoneDecisions: Object.fromEntries(
      state.zonePlaces.map((place) => [
        place.id,
        {
          selected: place.selected,
          suggestedDayId: place.suggestedDayId,
          order: place.order,
        },
      ]),
    ),
    protectedZonePlaces: state.zonePlaces
      .filter((place) => place.selected)
      .map((place) => structuredClone(place)),
  };
}

export function restoreActivityBlackBox(
  input: TripState,
  blackBox: ActivityBlackBox | null | undefined,
): TripState {
  if (!blackBox || blackBox.version !== 1) return structuredClone(input);

  const state = structuredClone(input);
  const protectedActivities = new Map(
    blackBox.protectedActivities.map((activity) => [activity.id, activity]),
  );

  state.activities = state.activities.map((activity) => {
    const decision = blackBox.activityDecisions[activity.id];
    const protectedActivity = protectedActivities.get(activity.id);

    if (!decision && !protectedActivity) return activity;

    const restored = protectedActivity
      ? { ...activity, ...structuredClone(protectedActivity) }
      : { ...activity };

    if (decision) {
      restored.included = decision.included;
      if (decision.included) {
        restored.dayId = decision.dayId;
        restored.order = decision.order;
      }
    }

    return restored;
  });

  const activityIds = new Set(state.activities.map((activity) => activity.id));
  blackBox.protectedActivities.forEach((activity) => {
    if (!activityIds.has(activity.id) && activity.included) {
      state.activities.push(structuredClone(activity));
      activityIds.add(activity.id);
    }
  });

  const protectedZonePlaces = new Map(
    blackBox.protectedZonePlaces.map((place) => [place.id, place]),
  );

  state.zonePlaces = state.zonePlaces.map((place) => {
    const decision = blackBox.zoneDecisions[place.id];
    const protectedPlace = protectedZonePlaces.get(place.id);
    if (!decision && !protectedPlace) return place;

    const restored = protectedPlace
      ? { ...place, ...structuredClone(protectedPlace) }
      : { ...place };

    if (decision) {
      restored.selected = decision.selected;
      if (decision.selected) {
        restored.suggestedDayId = decision.suggestedDayId;
        restored.order = decision.order;
      }
    }

    return restored;
  });

  const zonePlaceIds = new Set(state.zonePlaces.map((place) => place.id));
  blackBox.protectedZonePlaces.forEach((place) => {
    if (!zonePlaceIds.has(place.id) && place.selected) {
      state.zonePlaces.push(structuredClone(place));
      zonePlaceIds.add(place.id);
    }
  });

  return state;
}

export function readLocalActivityBlackBox(): ActivityBlackBox | null {
  try {
    const raw = localStorage.getItem(LOCAL_BLACK_BOX_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActivityBlackBox;
  } catch (error) {
    console.warn("Could not read activity black box", error);
    return null;
  }
}

export function writeLocalActivityBlackBox(state: TripState) {
  try {
    const blackBox = state.activityBlackBox ?? captureActivityBlackBox(state);
    localStorage.setItem(LOCAL_BLACK_BOX_KEY, JSON.stringify(blackBox));
  } catch (error) {
    console.warn("Could not write activity black box", error);
  }
}


export function newestActivityBlackBox(
  ...boxes: Array<ActivityBlackBox | null | undefined>
): ActivityBlackBox | null {
  const valid = boxes.filter((box): box is ActivityBlackBox => Boolean(box && box.version === 1));
  if (!valid.length) return null;
  return valid.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}
