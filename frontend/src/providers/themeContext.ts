import { createContext } from 'react';
import type { ResolvedTheme, ThemePreference } from '../utils/theme';

export interface ThemeContextValue {
  preference: ThemePreference; // what the user picked
  theme: ResolvedTheme; // what is shown now
  setPreference: (preference: ThemePreference) => void;
}

// Kept in its own file so ThemeProvider.tsx only exports a component (fast refresh rule)
export const ThemeContext = createContext<ThemeContextValue | null>(null);
