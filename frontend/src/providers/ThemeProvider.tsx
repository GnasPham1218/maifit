import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { readThemePreference, resolveTheme, saveThemePreference, type ThemePreference } from '../utils/theme';
import { ThemeContext } from './themeContext';

const DARK_QUERY = '(prefers-color-scheme: dark)';

// Puts data-theme on <html>; global.css switches every color token from it.
// public/theme-init.js already set it before the first paint; this keeps it in step afterwards.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readThemePreference);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(DARK_QUERY).matches);

  // "Theo máy": follow the system when it changes (e.g. sunset on a phone)
  useEffect(() => {
    const query = window.matchMedia(DARK_QUERY);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const theme = resolveTheme(preference, systemDark);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    // Browser chrome (address bar on phones) matches the page
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#121317' : '#f3f4f6');
  }, [theme]);

  const value = useMemo(() => ({
    preference,
    theme,
    setPreference: (next: ThemePreference) => {
      saveThemePreference(next);
      setPreferenceState(next);
    },
  }), [preference, theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
