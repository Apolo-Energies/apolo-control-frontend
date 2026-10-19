import { UserRole } from './enums';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  type: string;
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  expiresAt: number; // epoch ms — tokens viajan en HttpOnly cookies
}

export interface RefreshTokenResponse {
  type: string;
  expiresAt: number;
}

export interface AuthenticatedUser {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
}

export interface AuthSession {
  user: AuthenticatedUser;
  tokenExpiresAt: number; // epoch ms, para detectar expiración sin leer la cookie
}
