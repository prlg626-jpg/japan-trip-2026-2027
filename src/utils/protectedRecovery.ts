import type { TripState } from "../types";
import { captureActivityBlackBox } from "./activityBlackBox";

// Fill missing records without discarding current purchases, notes or custom items.
// Selection repair runs only for the known legacy degradation, before the marker.
export function recoverProtectedTrip(current: TripState, baseline: TripState, repairSelections: boolean): TripState {
  const result = structuredClone(current);
  for (const key of ["days", "activities", "hotels", "purchases", "reservations", "sources", "library", "zones", "zonePlaces", "routeSegments", "documents"] as const) {
    const existing = new Set(result[key].map((item) => item.id));
    const missing = baseline[key].filter((item) => !existing.has(item.id));
    (result[key] as Array<{ id: string }>).push(...structuredClone(missing));
  }
  if (repairSelections) {
    const activities = new Map(baseline.activities.map((item) => [item.id, item]));
    const places = new Map(baseline.zonePlaces.map((item) => [item.id, item]));
    result.activities.forEach((item) => {
      const saved = activities.get(item.id);
      if (saved?.included && !item.included) {
        item.included = true;
        item.dayId = saved.dayId;
        item.order = saved.order;
      }
    });
    result.zonePlaces.forEach((item) => {
      const saved = places.get(item.id);
      if (saved?.selected && !item.selected) {
        item.selected = true;
        item.suggestedDayId = saved.suggestedDayId;
        item.order = saved.order;
      }
    });
  }
  result.activityBlackBox = {
    ...captureActivityBlackBox(result),
    updatedAt: current.activityBlackBox?.updatedAt ?? baseline.activityBlackBox?.updatedAt ?? "",
  };
  return result;
}
