import type { FoodDetails } from '../types/food';
import type { Food, FoodRequestResponse, FoodSuggestion } from '../types/meal';
import { api } from './client';

// The food list only changes when a new migration is deployed, so it is fetched ONCE per page load
// and kept in memory. A Promise (not the array) is cached: two components asking at the same time
// share one request. A failed request is not cached, so the next call retries.
let cache: Promise<Food[]> | null = null;

// Details per food id. One answer holds every preparation, so it is stored under each of their ids:
// switching tabs on the detail page never asks again. Same rule: a failure is not kept.
const detailsCache = new Map<number, Promise<FoodDetails>>();

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

  details: (id: number): Promise<FoodDetails> => {
    let entry = detailsCache.get(id);
    if (!entry) {
      entry = api<FoodDetails>(`/foods/${id}/details`);
      detailsCache.set(id, entry);
      entry.then(
        (data) => data.variants.forEach((v) => detailsCache.set(v.id, entry!)),
        () => detailsCache.delete(id),
      );
    }
    return entry;
  },

  // Fuzzy search on the server (trigram + aliases): only called when the local search finds nothing
  suggest: (q: string): Promise<FoodSuggestion[]> =>
    api<FoodSuggestion[]>(`/foods/search?q=${encodeURIComponent(q)}`),

  // "Báo thiếu món": the same name reported twice, or by many users, stays one row on the server
  reportMissing: (name: string): Promise<FoodRequestResponse> =>
    api<FoodRequestResponse>('/food-requests', { method: 'POST', body: { name } }),
};
