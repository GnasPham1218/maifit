import type { CreateMealRequest, DailyMeals, Meal, MealItemRequest, MonthlySummary } from '../types/meal';
import { api } from './client';

// Meals change all the time: never cached, always fetched fresh
export const mealApi = {
  // date: yyyy-MM-dd (Vietnam time)
  listDay: (date: string) => api<DailyMeals>(`/meals?date=${date}`),

  // month: yyyy-MM (Vietnam time). kcal per day, for the calendar and the chart
  monthSummary: (month: string) => api<MonthlySummary>(`/meals/summary?month=${month}`),

  create: (data: CreateMealRequest) => api<Meal>('/meals', { method: 'POST', body: data }),

  addItem: (mealId: number, data: MealItemRequest) =>
    api<Meal>(`/meals/${mealId}/items`, { method: 'POST', body: data }),

  updateItemGrams: (mealId: number, itemId: number, grams: number) =>
    api<Meal>(`/meals/${mealId}/items/${itemId}`, { method: 'PATCH', body: { grams } }),

  // Removing the last item deletes the meal on the backend
  removeItem: (mealId: number, itemId: number) =>
    api<null>(`/meals/${mealId}/items/${itemId}`, { method: 'DELETE' }),

  remove: (mealId: number) => api<null>(`/meals/${mealId}`, { method: 'DELETE' }),
};
