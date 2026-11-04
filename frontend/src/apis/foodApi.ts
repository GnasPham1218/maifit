import type { Food, FoodSuggestion } from '../types/meal';
import { api } from './client';

// The food list only changes when a new migration is deployed, so it is fetched ONCE per page load
// and kept in memory. A Promise (not the array) is cached: two components asking at the same time
// share one request. A failed request is not cached, so the next call retries.
let cache: Promise<Food[]> | null = null;

export const foodApi = {
  listAll: (): Promise<Food[]> => {
    if (!cache) {
      cache = api<Food[]>('/foods').catch((err: unknown) => {
        cache = null;
        throw err;
      });
    }
    return cache;
  },

  // Fuzzy search on the server (trigram + aliases): only called when the local search finds nothing
  suggest: (q: string): Promise<FoodSuggestion[]> =>
    api<FoodSuggestion[]>(`/foods/search?q=${encodeURIComponent(q)}`),
};
