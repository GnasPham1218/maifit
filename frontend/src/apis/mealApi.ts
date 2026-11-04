import type {
  CreateMealRequest,
  DailyMeals,
  Meal,
  MealItemRequest,
  MonthlySummary,
  RecognizeResponse,
} from '../types/meal';
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

  // Costs 1 of the user's daily AI calls. image: a JPEG already resized by resizeForUpload
  recognize: (image: Blob) => {
    const form = new FormData();
    form.append('image', image, 'meal.jpg');
    return api<RecognizeResponse>('/meals/recognize', { method: 'POST', body: form });
  },
};
