import type { Food, Nutrition } from '../types/meal';

// Same formula and rounding as the backend (NutritionCalculator: grams x per100g / 100, 1 decimal),
// so the live preview matches what the server saves. The saved value always comes from the server.
const scale = (per100g: number, grams: number) => Math.round((per100g * grams) / 10) / 10;

// per-100g value at ratio r between lean (r=0) and fatty/as-listed (r=1). Mirrors the backend's
// NutritionCalculator.interpolate: both ends are real USDA rows, everything between is linear.
const interpolate = (lean: number, fatty: number, r: number) => lean + (fatty - lean) * r;

// fatPercent: 0-100, how much of food's as-listed fat is kept. Only meaningful when food has a
// lean counterpart (food.leanVersionId != null); pass leanFood for that counterpart's values.
export interface FatTrim {
  leanFood: Food;
  fatPercent: number;
}

// Live preview while typing grams
export function kcalFor(food: Food, grams: number, trim?: FatTrim): number {
  if (!trim) return scale(food.kcal, grams);
  return scale(interpolate(trim.leanFood.kcal, food.kcal, trim.fatPercent / 100), grams);
}

// Calories + macros for these grams. A null in the food stays null: "no data", not 0
export function nutritionFor(food: Food, grams: number, trim?: FatTrim): Nutrition {
  if (!trim) {
    const part = (v: number | null) => (v == null ? null : scale(v, grams));
    return {
      kcal: scale(food.kcal, grams),
      proteinG: part(food.proteinG),
      carbG: part(food.carbG),
      fatG: part(food.fatG),
      fiberG: part(food.fiberG),
    };
  }
  const r = trim.fatPercent / 100;
  const part = (lean: number | null, fatty: number | null) =>
    lean == null || fatty == null ? null : scale(interpolate(lean, fatty, r), grams);
  return {
    kcal: scale(interpolate(trim.leanFood.kcal, food.kcal, r), grams),
    proteinG: part(trim.leanFood.proteinG, food.proteinG),
    carbG: part(trim.leanFood.carbG, food.carbG),
    fatG: part(trim.leanFood.fatG, food.fatG),
    fiberG: part(trim.leanFood.fiberG, food.fiberG),
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
