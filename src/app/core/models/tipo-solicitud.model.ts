export interface TipoSolicitud {
  id: string;
  codigo: string;
  nombre: string;
  activo: boolean;
  orden: number;
  diasRecordatorio: number;
  createdAt: string;
}

export interface TipoSolicitudRequest {
  codigo: string;
  nombre: string;
  activo?: boolean;
  orden?: number;
  diasRecordatorio?: number;
}
