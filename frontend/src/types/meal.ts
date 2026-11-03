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
