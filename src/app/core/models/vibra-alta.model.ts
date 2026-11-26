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
  liquidacionColaborador: string | null;
  comisionComercializadora: number | null;
  historialLiquidaciones: string | null;
  comentarios: string | null;

  /** Producto (tarifa Vibra) del contrato. */
  tarifaId: string | null;
  tarifaAcceso: string | null;
  /** Precios propios P1–P6 (null = el del producto). */
  precioEnergia: (number | null)[];
  precioPotencia: (number | null)[];
  /** Solo en el detalle. */
  servicios?: VibraAltaServicio[] | null;
  /** Nº de Kilowy en las importadas; si no, el propio. */
  numeroContrato: string | null;
  contratoEnviadoAt: string | null;
  /** Solo al crear con envío: por qué no se envió el contrato. */
  avisoContrato?: string | null;

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
  liquidacionColaborador?: string | null;
  comisionComercializadora?: number | null;
  historialLiquidaciones?: string | null;
  comentarios?: string | null;
  /** Al editar, null = no cambia el producto. */
  tarifaId?: string | null;
  /** Solo al crear: envía el contrato al email del alta. */
  enviarContrato?: boolean;
}

export type ModoServicioVibra = 'IMPORTE_DIA' | 'IMPORTE_MES' | 'IMPORTE_FACTURA' | 'PCT_COMPRA';
export type ZonaServicioVibra = 'ANTES' | 'DESPUES';

export const MODO_SERVICIO_LABEL: Record<ModoServicioVibra, string> = {
  PCT_COMPRA: '% de la factura de compra',
  IMPORTE_MES: '€ al mes (prorrateado por días)',
  IMPORTE_DIA: '€ por día',
  IMPORTE_FACTURA: '€ por factura',
};

/** Servicio del contrato: una línea en cada factura. ivaPct null = no sujeto. */
export interface VibraAltaServicio {
  concepto: string;
  modo: ModoServicioVibra;
  valor: number;
  ivaPct: number | null;
  zona: ZonaServicioVibra;
}

/** Precios propios (6 periodos, null = el del producto), tarifa de acceso y servicios. */
export interface VibraAltaPreciosPayload {
  energia: (number | null)[];
  potencia: (number | null)[];
  tarifaAcceso: string | null;
  servicios: VibraAltaServicio[];
}

export interface KilowyFichasImportResult {
  contratos: number;
  leidas: number;
  fallidas: number;
  sinAlta: number;
  completadas: number;
  sinCambios: number;
  rellenados: Record<string, number>;
  avisos: string[];
}

/** Estado de la importación de fichas de Kilowy (en segundo plano). */
export interface KilowyFichasEstado {
  enCurso: boolean;
  inicio: string | null;
  fin: string | null;
  contratos: number;
  leidas: number;
  resultado: KilowyFichasImportResult | null;
  error: string | null;
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

export interface TramitadoPayload {
  tramitado: boolean;
}

export interface LiquidadoPayload {
  liquidado: string;
}

export interface LiquidacionColaboradorPayload {
  liquidacionColaborador: string;
}

// ── Filter ───────────────────────────────────────────────────────

export interface VibraAltaFilter {
  q?: string;
  estado?: string;
  colaborador?: string;
  comercializadora?: string;
  gestionado?: boolean;
  tramitado?: boolean;
  fechaDesde?: string;
  fechaHasta?: string;
}
