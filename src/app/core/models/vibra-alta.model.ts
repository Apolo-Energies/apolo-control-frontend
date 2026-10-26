// ── Enums ────────────────────────────────────────────────────────

/** Mismos estados que Kilowy (CRM de Vibra), que es quien manda. */
export type EstadoVibraAlta = 'ACTIVO' | 'FIRMADO' | 'TRAMITADO' | 'PENDIENTE_FIRMA' | 'BAJA' | 'CANCELADO';

export const ESTADO_VIBRA_ALTA_VALUES: EstadoVibraAlta[] = [
  'ACTIVO', 'FIRMADO', 'TRAMITADO', 'PENDIENTE_FIRMA', 'BAJA', 'CANCELADO',
];

export const ESTADO_VIBRA_ALTA_LABEL: Record<EstadoVibraAlta, string> = {
  ACTIVO: 'Activo',
  FIRMADO: 'Firmado',
  TRAMITADO: 'Tramitado',
  PENDIENTE_FIRMA: 'Pendiente de firma',
  BAJA: 'Baja',
  CANCELADO: 'Cancelado',
};

export type ComercializadoraVibra = 'ENDESA' | 'APOLO' | 'REPSOL' | 'IBERDROLA' | 'PTE TRAMITAR';

/** Altas aún sin compañía: no entran en la rotación semestral. */
export const COMERCIALIZADORA_PTE_TRAMITAR: ComercializadoraVibra = 'PTE TRAMITAR';

export const COMERCIALIZADORA_VIBRA_VALUES: ComercializadoraVibra[] = [
  'ENDESA', 'APOLO', 'REPSOL', 'IBERDROLA', 'PTE TRAMITAR',
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
  fechaBaja: string | null;

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
  comisionComercializadora: number | null;
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
  fechaBaja?: string | null;
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
  comisionComercializadora?: number | null;
  historialLiquidaciones?: string | null;
  comentarios?: string | null;
}

export interface KilowySyncResult {
  total: number;
  creadas: number;
  actualizadas: number;
  sinCambios: number;
  omitidas: number;
  errores: number;
  cambiosEstado: string[];
  errorDetails: string[];
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
