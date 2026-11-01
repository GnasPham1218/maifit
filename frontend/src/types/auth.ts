// Mirrors the backend DTOs (UserResponse, LoginResponse, RegisterRequest)
export type Role = 'USER' | 'ADMIN';

export interface User {
  id: number;
  email: string;
  username: string;
  displayName: string;
  role: Role;
}

export interface LoginResponse {
  accessToken: string;
  accessTokenExpiresAt: string; // ISO-8601, UTC
  user: User;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  displayName: string;
}

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';
