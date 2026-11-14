import { createContext } from 'react';
import type { AuthStatus, User } from '../types/auth';

export interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void; // after a change saved on the server (e.g. the accent color)
}

// Kept in its own file so AuthProvider.tsx only exports a component (fast refresh rule)
export const AuthContext = createContext<AuthContextValue | null>(null);
