import type { BodyCheckin, CreateBodyCheckinRequest, Profile, ProfileRequest } from '../types/profile';
import { api, ApiError } from './client';

export const profileApi = {
  // Throws ApiError with code PROFILE_NOT_FOUND when the user has not set up a profile yet
  get: () => api<Profile>('/profile'),

  // Same as get, but "no profile yet" -> null instead of an error
  find: async (): Promise<Profile | null> => {
    try {
      return await api<Profile>('/profile');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'PROFILE_NOT_FOUND') return null;
      throw err;
    }
  },

  save: (data: ProfileRequest) => api<Profile>('/profile', { method: 'PUT', body: data }),
};

export const bodyCheckinApi = {
  // from / to: yyyy-MM-dd (Vietnam time, inclusive). Default on the backend: the last 90 days.
  list: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const query = params.toString();
    return api<BodyCheckin[]>(`/body-checkins${query ? `?${query}` : ''}`);
  },

  create: (data: CreateBodyCheckinRequest) =>
    api<BodyCheckin>('/body-checkins', { method: 'POST', body: data }),

  remove: (id: number) => api<null>(`/body-checkins/${id}`, { method: 'DELETE' }),
};
