import type { Food } from '../types/meal';

// Live preview while typing grams. Same formula and rounding as the backend
// (NutritionCalculator: grams x per100g / 100, 1 decimal); the saved value always comes from the server.
export function kcalFor(food: Food, grams: number): number {
  return Math.round((food.kcal * grams) / 10) / 10;
}

// Grams accepted by the backend: 0.1 .. 5000, at most 1 decimal
export function parseGrams(value: string): number | null {
  if (!/^\d{1,4}([.,]\d)?$/.test(value.trim())) return null;
  const grams = Number(value.trim().replace(',', '.'));
  return grams >= 0.1 && grams <= 5000 ? grams : null;
}
