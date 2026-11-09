import type { LoginResponse, RegisterRequest, User } from '../types/auth';
import { api, refreshAccessToken, setAccessToken } from './client';

export const authApi = {
  register: (data: RegisterRequest) =>
    api<User>('/auth/register', { method: 'POST', body: data, auth: false }),

  verifyEmail: (token: string) =>
    api<null>('/auth/verify-email', { method: 'POST', body: { token }, auth: false }),

  login: async (email: string, password: string): Promise<LoginResponse> => {
    const result = await api<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    });
    setAccessToken(result.accessToken);
    return result;
  },

  // Uses the HttpOnly refresh cookie; returns the same shape as login
  refresh: (): Promise<LoginResponse> => refreshAccessToken(),

  logout: async (): Promise<void> => {
    try {
      await api<null>('/auth/logout', { method: 'POST', auth: false });
    } finally {
      setAccessToken(null); // forget the access token even if the request failed
    }
  },

  forgotPassword: (email: string, captchaToken: string) =>
    api<null>('/auth/forgot-password', { method: 'POST', body: { email, captchaToken }, auth: false }),

  resetPassword: (token: string, newPassword: string) =>
    api<null>('/auth/reset-password', { method: 'POST', body: { token, newPassword }, auth: false }),

  me: () => api<User>('/auth/me'),
};
