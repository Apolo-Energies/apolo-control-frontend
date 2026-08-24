import { UserRole } from './enums';

export interface PerfilResponse {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  telefono: string | null;
  cargo: string | null;
  hasFirma: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PerfilUpdateRequest {
  nombre: string;
  telefono: string | null;
  cargo: string | null;
}
