// Small fetch wrapper for the MAIFit API.
// - Every response is an ApiResponse: { success, code?, message?, data?, errors? }
// - The access token lives only in memory (this module), never in localStorage
// - A 401 triggers ONE refresh (refresh token = HttpOnly cookie) and the request is retried once
import type { ApiResponse } from '../types/api';
import type { LoginResponse } from '../types/auth';

let accessToken: string | null = null;
let refreshPromise: Promise<LoginResponse> | null = null;
let onSessionExpired: () => void = () => {};

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

// AuthProvider registers a callback here to log the user out in the UI when refresh fails
export function setSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly errors: Record<string, string> | null; // field -> message, for VALIDATION_FAILED

  constructor(status: number, body: ApiResponse<unknown> | null) {
    super(body?.message ?? `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = body?.code ?? (status === 0 ? 'NETWORK_ERROR' : 'UNKNOWN');
    this.errors = body?.errors ?? null;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean; // false for public endpoints: no Authorization header, no refresh on 401
}

async function send<T>(path: string, { method = 'GET', body, auth = true }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const isForm = body instanceof FormData;
  // FormData: no Content-Type here, the browser adds 'multipart/form-data; boundary=...' itself
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  // Public endpoints never get the header: an expired token would make Spring reject them
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'same-origin', // send the refresh cookie (same origin thanks to the Vite proxy / Nginx)
    });
  } catch {
    throw new ApiError(0, null); // server unreachable
  }

  const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!res.ok || json?.success === false) {
    throw new ApiError(res.status, json);
  }
  return (json?.data ?? null) as T;
}

// Only ONE refresh request at a time. If two run in parallel they send the same refresh token,
// and the backend treats the second one as a stolen token and logs the user out everywhere.
// This happens for real: several API calls failing with 401 together, or React StrictMode
// running effects twice in development.
export function refreshAccessToken(): Promise<LoginResponse> {
  if (!refreshPromise) {
    refreshPromise = send<LoginResponse>('/auth/refresh', { method: 'POST', auth: false })
      .then((result) => {
        accessToken = result.accessToken;
        return result;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  try {
    return await send<T>(path, options);
  } catch (err) {
    const shouldRefresh = options.auth !== false && err instanceof ApiError && err.status === 401;
    if (!shouldRefresh) throw err;

    try {
      await refreshAccessToken();
    } catch {
      accessToken = null;
      onSessionExpired();
      throw err;
    }
    return send<T>(path, options); // retry once with the new access token
  }
}
