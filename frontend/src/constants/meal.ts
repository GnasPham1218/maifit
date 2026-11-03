import type { MealType, Preparation } from '../types/meal';

export const MEAL_TYPES: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  BREAKFAST: 'Bữa sáng',
  LUNCH: 'Bữa trưa',
  DINNER: 'Bữa tối',
  SNACK: 'Bữa phụ',
};

// Order of the "weighed raw or cooked?" choices
export const PREPARATIONS: Preparation[] = ['RAW', 'BOILED', 'STEAMED', 'GRILLED', 'FRIED', 'BRAISED'];

// Chip next to a food name. RAW has none: it is the default state ("as bought")
export const PREPARATION_LABELS: Record<Preparation, string> = {
  RAW: 'Sống',
  BOILED: 'Luộc',
  STEAMED: 'Hấp',
  FRIED: 'Chiên',
  BRAISED: 'Kho',
  GRILLED: 'Nướng',
};

// Answers to "Bạn cân lúc nào?"
export const WEIGHED_WHEN_LABELS: Record<Preparation, string> = {
  RAW: 'Lúc còn sống',
  BOILED: 'Sau khi luộc',
  STEAMED: 'Sau khi hấp',
  FRIED: 'Sau khi chiên',
  BRAISED: 'Sau khi kho',
  GRILLED: 'Sau khi nướng',
};

// Back-filling a past day: a typical time for each meal (Vietnam time)
export const MEAL_DEFAULT_HOUR: Record<MealType, number> = {
  BREAKFAST: 7,
  LUNCH: 12,
  SNACK: 15,
  DINNER: 19,
};
