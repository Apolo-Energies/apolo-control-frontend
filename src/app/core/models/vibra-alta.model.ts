// ── Enums ────────────────────────────────────────────────────────

export type EstadoVibraAlta = 'FIRMADO' | 'BAJA' | 'CANCELADO' | 'Pendiente';

export const ESTADO_VIBRA_ALTA_VALUES: EstadoVibraAlta[] = [
  'FIRMADO', 'BAJA', 'CANCELADO', 'Pendiente',
];

export const ESTADO_VIBRA_ALTA_LABEL: Record<EstadoVibraAlta, string> = {
  FIRMADO: 'Firmado',
  BAJA: 'Baja',
  CANCELADO: 'Cancelado',
  Pendiente: 'Pendiente',
};

export type ComercializadoraVibra = 'ENDESA' | 'APOLO' | 'REPSOL' | 'IBERDROLA';

export const COMERCIALIZADORA_VIBRA_VALUES: ComercializadoraVibra[] = [
  'ENDESA', 'APOLO', 'REPSOL', 'IBERDROLA',
];

// ── Entity ───────────────────────────────────────────────────────

export interface VibraAlta {
  id: string;
  idExterno: string;

  cups: string | null;
  titular: string | null;
  nifCif: string | null;

  direccionSuministro: string | null;
  poblacion: string | null;
  provincia: string | null;

  telefono: string | null;
  email: string | null;
  cuentaBancaria: string | null;

  comercializadora: string | null;
  estado: string | null;
  consumo: number | null;

  fecha: string | null;
  fechaTramitacion: string | null;
  fechaRenovacion: string | null;
  fechaFirma: string | null;
  fechaCambioComercializadora: string | null;
  fechaActivacionContrato: string | null;

  colaborador: string | null;
  mesLiquidacion: string | null;

  potenciaOriginal: string | null;
  potenciaP1: number | null;
  potenciaP2: number | null;
  potenciaP3: number | null;
  potenciaP4: number | null;
  potenciaP5: number | null;
  potenciaP6: number | null;

  tramitado: boolean | null;
  gestionado: boolean;
  liquidado: string | null;
  liquidacionColaborador: number | null;
  historialLiquidaciones: string | null;
  comentarios: string | null;

  createdAt: string;
  updatedAt: string;
}

// ── Payloads ─────────────────────────────────────────────────────

export interface VibraAltaPayload {
  titular: string;
  cups?: string | null;
  nifCif?: string | null;
  direccionSuministro?: string | null;
  poblacion?: string | null;
  provincia?: string | null;
  telefono?: string | null;
  email?: string | null;
  cuentaBancaria?: string | null;
  comercializadora?: string | null;
  estado?: string | null;
  consumo?: number | null;
  fecha?: string | null;
  fechaTramitacion?: string | null;
  fechaRenovacion?: string | null;
  fechaFirma?: string | null;
  fechaCambioComercializadora?: string | null;
  fechaActivacionContrato?: string | null;
  colaborador?: string | null;
  mesLiquidacion?: string | null;
  potenciaOriginal?: string | null;
  potenciaP1?: number | null;
  potenciaP2?: number | null;
  potenciaP3?: number | null;
  potenciaP4?: number | null;
  potenciaP5?: number | null;
  potenciaP6?: number | null;
  tramitado?: boolean | null;
  liquidado?: string | null;
  liquidacionColaborador?: number | null;
  historialLiquidaciones?: string | null;
  comentarios?: string | null;
}

export interface CambiarEstadoVibraAltaPayload {
  estado: string;
}

export interface GestionadoPayload {
  gestionado: boolean;
}

export interface LiquidadoPayload {
  liquidado: string;
}

// ── Filter ───────────────────────────────────────────────────────

export interface VibraAltaFilter {
  q?: string;
  estado?: string;
  colaborador?: string;
  comercializadora?: string;
  gestionado?: boolean;
  fechaDesde?: string;
  fechaHasta?: string;
}
