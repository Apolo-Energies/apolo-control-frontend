export interface Branch {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BranchPayload {
  nombre: string;
  descripcion?: string | null;
  activo?: boolean;
}
