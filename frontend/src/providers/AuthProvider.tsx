import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi } from '../apis/authApi';
import { setSessionExpiredHandler } from '../apis/client';
import type { AuthStatus, User } from '../types/auth';
import { applyAccent, isAccentColor } from '../utils/accent';
import { AuthContext, type AuthContextValue } from './authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    // Called by the API client when a refresh fails (session over, or revoked)
    setSessionExpiredHandler(() => {
      setUser(null);
      setStatus('anonymous');
    });

    // On page load the access token (memory) is gone, but the refresh cookie may still be there:
    // try to restore the session silently.
    let cancelled = false;
    authApi
      .refresh()
      .then((result) => {
        if (cancelled) return;
        setUser(result.user);
        setStatus('authenticated');
      })
      .catch(() => {
        if (cancelled) return;
        setUser(null);
        setStatus('anonymous');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    setUser(result.user);
    setStatus('authenticated');
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  const updateUser = useCallback((next: User) => setUser(next), []);

  // The account's accent color wins over the one remembered on this device (another device may have changed it)
  const accent = user?.accentColor;
  useEffect(() => {
    if (isAccentColor(accent)) applyAccent(accent);
  }, [accent]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, logout, updateUser }),
    [user, status, login, logout, updateUser],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
