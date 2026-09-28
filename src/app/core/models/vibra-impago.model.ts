export type EstadoVibraImpago = 'Contactado' | 'Pdte. contactar' | 'Pagado';

export const ESTADO_VIBRA_IMPAGO_VALUES: EstadoVibraImpago[] = [
  'Pdte. contactar', 'Contactado', 'Pagado',
];

export type ActivoBajaVibra = 'Activo' | 'Baja';

export const ACTIVO_BAJA_VALUES: ActivoBajaVibra[] = ['Activo', 'Baja'];

export interface VibraImpago {
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

export interface VibraImpagoPayload {
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

export interface CambiarEstadoVibraImpagoPayload {
  estado: string;
}

export interface VibraImpagoFilter {
  q?: string;
  estado?: string;
  activoBaja?: string;
  colaborador?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}
