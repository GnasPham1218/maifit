import type { BodyCheckin, CreateBodyCheckinRequest, Profile, ProfileRequest } from '../types/profile';
import { api } from './client';

export const profileApi = {
  // Throws ApiError with code PROFILE_NOT_FOUND when the user has not set up a profile yet
  get: () => api<Profile>('/profile'),

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
