import { useCallback, useEffect, useMemo, useState } from "react";

const KEY = "japan-trip-travel-mode-progress-v1";

interface TravelProgress {
  completedIds: string[];
  skippedIds: string[];
  arrivedIds: string[];
  updatedAt: string;
}

function emptyProgress(): TravelProgress {
  return {
    completedIds: [],
    skippedIds: [],
    arrivedIds: [],
    updatedAt: new Date(0).toISOString(),
  };
}

function readProgress(): TravelProgress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as Partial<TravelProgress>;
    return {
      completedIds: Array.isArray(parsed.completedIds) ? parsed.completedIds : [],
      skippedIds: Array.isArray(parsed.skippedIds) ? parsed.skippedIds : [],
      arrivedIds: Array.isArray(parsed.arrivedIds) ? parsed.arrivedIds : [],
      updatedAt: parsed.updatedAt || new Date(0).toISOString(),
    };
  } catch {
    return emptyProgress();
  }
}

export function useTravelProgress() {
  const [progress, setProgress] = useState<TravelProgress>(readProgress);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(progress));
  }, [progress]);

  const update = useCallback(
    (activityId: string, action: "arrived" | "completed" | "skipped" | "restore") => {
      setProgress((current) => {
        const completed = new Set(current.completedIds);
        const skipped = new Set(current.skippedIds);
        const arrived = new Set(current.arrivedIds);

        if (action === "restore") {
          completed.delete(activityId);
          skipped.delete(activityId);
          arrived.delete(activityId);
        } else if (action === "arrived") {
          arrived.add(activityId);
          skipped.delete(activityId);
        } else if (action === "completed") {
          completed.add(activityId);
          arrived.add(activityId);
          skipped.delete(activityId);
        } else {
          skipped.add(activityId);
          completed.delete(activityId);
          arrived.delete(activityId);
        }

        return {
          completedIds: [...completed],
          skippedIds: [...skipped],
          arrivedIds: [...arrived],
          updatedAt: new Date().toISOString(),
        };
      });
    },
    [],
  );

  const resetIds = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setProgress((current) => ({
      completedIds: current.completedIds.filter((id) => !idSet.has(id)),
      skippedIds: current.skippedIds.filter((id) => !idSet.has(id)),
      arrivedIds: current.arrivedIds.filter((id) => !idSet.has(id)),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  return useMemo(
    () => ({
      progress,
      completed: new Set(progress.completedIds),
      skipped: new Set(progress.skippedIds),
      arrived: new Set(progress.arrivedIds),
      markArrived: (id: string) => update(id, "arrived"),
      markCompleted: (id: string) => update(id, "completed"),
      skip: (id: string) => update(id, "skipped"),
      restore: (id: string) => update(id, "restore"),
      resetIds,
    }),
    [progress, update, resetIds],
  );
}
