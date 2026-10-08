export type EstadoTelkesImpago = 'Contactado' | 'Pdte. contactar' | 'Pagado';

export const ESTADO_TELKES_IMPAGO_VALUES: EstadoTelkesImpago[] = [
  'Pdte. contactar', 'Contactado', 'Pagado',
];

export type ActivoBajaTelkes = 'Activo' | 'Baja';

export const ACTIVO_BAJA_TELKES_VALUES: ActivoBajaTelkes[] = ['Activo', 'Baja'];

export interface TelkesImpago {
  id: string;
  idExterno: string;
  cliente: string | null;
  factura: string | null;
  importe: number | null;
  fechaDevolucion: string | null;
  estado: string | null;
  motivoDevolucion: string | null;
  activoBaja: string | null;
  colaborador: string | null;
  comentarios: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TelkesImpagoPayload {
  cliente: string;
  factura?: string | null;
  importe?: number | null;
  fechaDevolucion?: string | null;
  estado?: string | null;
  motivoDevolucion?: string | null;
  activoBaja?: string | null;
  colaborador?: string | null;
  comentarios?: string | null;
}

export interface CambiarEstadoTelkesImpagoPayload {
  estado: string;
}

export interface TelkesImpagoFilter {
  q?: string;
  estado?: string;
  activoBaja?: string;
  colaborador?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}
