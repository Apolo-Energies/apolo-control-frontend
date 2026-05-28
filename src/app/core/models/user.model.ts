import { UserRole } from './enums';

export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserPayload {
  nombre: string;
  email: string;
  password?: string;
  rol: UserRole;
  activo: boolean;
}
