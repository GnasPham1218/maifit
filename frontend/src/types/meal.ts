// Mirrors the backend DTOs in food/dto and meal/dto
export type Preparation = 'RAW' | 'BOILED' | 'STEAMED' | 'FRIED' | 'BRAISED' | 'GRILLED';
export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

// Values per 100 g. null = the source has no data (not zero)
export interface Food {
  id: number;
  name: string;
  preparation: Preparation;
  kcal: number;
  proteinG: number | null;
  carbG: number | null;
  fatG: number | null;
  fiberG: number | null;
  source: string;
}

// GET /foods/search: a close food name when the local search finds nothing
export interface FoodSuggestion {
  name: string;
  score: number; // 0..1
}

export interface Nutrition {
  kcal: number;
  proteinG: number | null;
  carbG: number | null;
  fatG: number | null;
  fiberG: number | null;
}

export interface MealItem {
  id: number;
  foodId: number;
  foodName: string;
  preparation: Preparation;
  grams: number;
  aiGrams: number | null; // the AI's original estimate (photo flow); null when typed by hand
  nutrition: Nutrition; // for these grams
}

export interface Meal {
  id: number;
  mealType: MealType;
  eatenAt: string; // ISO-8601, UTC
  items: MealItem[];
  totals: Nutrition;
}

export interface DailyMeals {
  date: string; // yyyy-MM-dd, Vietnam time
  totals: Nutrition;
  meals: Meal[];
}

export interface MealItemRequest {
  foodId: number;
  grams: number;
  aiGrams?: number | null; // the AI's estimate when the item came from a photo
}

// POST /meals/recognize: suggestions only, nothing is saved yet.
// No calories here: they are computed from the foods table (kcalFor), never by the AI.
export interface RecognizedFood {
  foodId: number;
  name: string; // from the foods table
  preparation: Preparation;
  grams: number;
  aiName: string; // what the AI saw, e.g. "cơm trắng" (matched to "Gạo tẻ", boiled)
  lowConfidence: boolean; // weak name match or a cooking state we do not have: ask the user to check
}

export interface RecognizeResponse {
  items: RecognizedFood[];
  unmatched: string[]; // names the AI saw that match no food in our table
  remainingToday: number;
}

export interface CreateMealRequest {
  mealType: MealType;
  eatenAt?: string; // omitted = now
  items: MealItemRequest[];
}

export interface DailyKcal {
  date: string; // yyyy-MM-dd
  kcal: number;
}

// Only days that have meals; a missing day means "nothing logged", not 0 kcal
export interface MonthlySummary {
  month: string; // yyyy-MM
  days: DailyKcal[];
}
