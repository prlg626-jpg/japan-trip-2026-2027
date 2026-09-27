import type { Activity, MealSlot, ZonePlace } from "../types";

type MealLike = Pick<Activity, "title" | "category" | "subCategory" | "start" | "mealSlot">;

function textForMeal(item: Pick<MealLike, "title" | "category" | "subCategory">) {
  return `${item.title} ${item.category} ${item.subCategory}`.toLowerCase();
}

export function inferMealSlot(item: Partial<MealLike>): MealSlot | null {
  if (item.mealSlot) return item.mealSlot;
  const text = textForMeal({
    title: item.title ?? "",
    category: item.category ?? "",
    subCategory: item.subCategory ?? "",
  });

  const looksLikeFood =
    /food|cafe|restaurant|meal|breakfast|lunch|dinner|snack|desayuno|almuerzo|cena|cheesecake|takoyaki|okonomiyaki|matcha/.test(
      text,
    );
  if (!looksLikeFood) return null;

  if (/breakfast|desayuno|brunch/.test(text)) return "breakfast";
  if (/dinner|cena|kaiseki|nochevieja|nye/.test(text)) return "dinner";
  if (/snack|cheesecake|matcha|cafe|café|takoyaki|dessert|postre/.test(text)) return "snack";
  if (/lunch|almuerzo/.test(text)) return "lunch";

  if (item.start && /^\d{2}:\d{2}$/.test(item.start)) {
    const hour = Number(item.start.slice(0, 2));
    if (hour < 10) return "breakfast";
    if (hour < 14) return "lunch";
    if (hour < 17) return "snack";
    return "dinner";
  }
  return "lunch";
}

export function inferZoneMealSlot(place: ZonePlace): MealSlot | null {
  return (
    place.mealSlot ??
    inferMealSlot({
      title: place.title,
      category: place.category,
      subCategory: place.subCategory,
      start: "",
    })
  );
}

export function mealSlotLabel(slot: MealSlot | null | undefined) {
  if (slot === "breakfast") return "Desayuno";
  if (slot === "lunch") return "Almuerzo";
  if (slot === "snack") return "Snack";
  if (slot === "dinner") return "Cena";
  return "";
}

export function defaultMealStart(slot: MealSlot | null | undefined) {
  if (slot === "breakfast") return "09:00";
  if (slot === "lunch") return "12:30";
  if (slot === "snack") return "16:00";
  if (slot === "dinner") return "19:00";
  return "";
}

export function mealInsertionIndex(slot: MealSlot | null | undefined, activeCount: number) {
  if (slot === "breakfast") return 0;
  if (slot === "lunch") return Math.max(1, Math.round(activeCount * 0.42));
  if (slot === "snack") return Math.max(1, Math.round(activeCount * 0.7));
  if (slot === "dinner") return activeCount;
  return activeCount;
}
