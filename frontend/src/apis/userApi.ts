import type { User } from '../types/auth';
import type { AccentColor } from '../utils/accent';
import { api } from './client';

export const userApi = {
  // Returns the user with the new color (the server only accepts the fixed list)
  updateAccentColor: (accentColor: AccentColor) =>
    api<User>('/users/me/accent-color', { method: 'PUT', body: { accentColor } }),
};
