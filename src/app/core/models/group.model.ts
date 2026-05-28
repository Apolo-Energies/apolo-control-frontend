export interface Group {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GroupPayload {
  nombre: string;
  descripcion?: string | null;
  activo?: boolean;
}
