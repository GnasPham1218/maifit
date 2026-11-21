import type { Allergen } from '../types/profile';
import { api } from './client';

// Reference data (changes only with a migration): fetched once per page load. Public, so the
// "about allergen data" page works without logging in. A failed request is not cached.
let cache: Promise<Allergen[]> | null = null;

export const allergenApi = {
  list: (): Promise<Allergen[]> => {
    if (!cache) {
      cache = api<Allergen[]>('/allergens', { auth: false }).catch((err: unknown) => {
        cache = null;
        throw err;
      });
    }
    return cache;
  },
};
