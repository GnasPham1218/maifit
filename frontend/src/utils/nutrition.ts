import type { Food, Nutrition } from '../types/meal';

// Same formula and rounding as the backend (NutritionCalculator: grams x per100g / 100, 1 decimal),
// so the live preview matches what the server saves. The saved value always comes from the server.
const scale = (per100g: number, grams: number) => Math.round((per100g * grams) / 10) / 10;

// Live preview while typing grams
export function kcalFor(food: Food, grams: number): number {
  return scale(food.kcal, grams);
}

// Calories + macros for these grams. A null in the food stays null: "no data", not 0
export function nutritionFor(food: Food, grams: number): Nutrition {
  const part = (v: number | null) => (v == null ? null : scale(v, grams));
  return {
    kcal: scale(food.kcal, grams),
    proteinG: part(food.proteinG),
    carbG: part(food.carbG),
    fatG: part(food.fatG),
    fiberG: part(food.fiberG),
  };
}

export interface NutritionTotal {
  total: Nutrition;
  incomplete: boolean; // at least one food has no data for some macro: the total is a lower bound
}

// Like the backend: unknown (null) values are skipped, so a total is the sum of what is known.
// Unlike the backend, it also says whether something was skipped, so the UI can warn about it.
export function sumNutrition(parts: Nutrition[]): NutritionTotal {
  const round = (n: number) => Math.round(n * 10) / 10;
  let incomplete = false;
  const add = (pick: (n: Nutrition) => number | null) =>
    round(parts.reduce((sum, n) => {
      const v = pick(n);
      if (v == null) incomplete = true;
      return sum + (v ?? 0);
    }, 0));
  const total: Nutrition = {
    kcal: add((n) => n.kcal),
    proteinG: add((n) => n.proteinG),
    carbG: add((n) => n.carbG),
    fatG: add((n) => n.fatG),
    fiberG: add((n) => n.fiberG),
  };
  return { total, incomplete };
}

// Grams accepted by the backend: 0.1 .. 5000, at most 1 decimal
export function parseGrams(value: string): number | null {
  if (!/^\d{1,4}([.,]\d)?$/.test(value.trim())) return null;
  const grams = Number(value.trim().replace(',', '.'));
  return grams >= 0.1 && grams <= 5000 ? grams : null;
}
