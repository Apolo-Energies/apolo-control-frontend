import { UserRole } from './enums';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  type: string;
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
  type: string;
}

export interface AuthenticatedUser {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
}

export interface AuthSession {
  token: string;
  refreshToken: string;
  user: AuthenticatedUser;
}
