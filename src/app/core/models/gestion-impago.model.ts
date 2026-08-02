// ── Enums / union types ──────────────────────────────────────────────────────

export type EstadoGestionImpago =
  | 'nuevo'
  | 'va_a_pagar'
  | 'acuerdo_pago'
  | 'aviso_corte'
  | 'cortado'
  | 'ovc'
  | 'demanda'
  | 'pagado'
  | 'remesar_nuevamente'
  | 'otros';

export const ESTADO_GESTION_IMPAGO_VALUES: EstadoGestionImpago[] = [
  'nuevo', 'va_a_pagar', 'acuerdo_pago', 'aviso_corte', 'cortado',
  'ovc', 'demanda', 'pagado', 'remesar_nuevamente', 'otros',
];

export const ESTADO_GESTION_IMPAGO_LABEL: Record<EstadoGestionImpago, string> = {
  nuevo: 'Nuevo',
  va_a_pagar: 'Acuerdo Verbal',
  acuerdo_pago: 'Acuerdo de Pago',
  aviso_corte: 'Aviso de Corte',
  cortado: 'Cortado',
  ovc: 'Acuerdo Formal OVC',
  demanda: 'Demanda',
  pagado: 'Pagado',
  remesar_nuevamente: 'Remesar nuevamente',
  otros: 'Otros',
};

export type PrioridadGestionImpago = 'baja' | 'media' | 'alta' | 'urgente';

export const PRIORIDAD_GESTION_IMPAGO_LABEL: Record<PrioridadGestionImpago, string> = {
  baja: 'Baja', media: 'Media', alta: 'Alta', urgente: 'Urgente',
};

export type NivelRiesgoGestionCliente = 'bajo' | 'medio' | 'alto' | 'critico';

export const NIVEL_RIESGO_LABEL: Record<NivelRiesgoGestionCliente, string> = {
  bajo: 'Bajo', medio: 'Medio', alto: 'Alto', critico: 'Crítico',
};

export type TipoAccionCobranza =
  | 'llamada' | 'email' | 'whatsapp' | 'aviso_legal' | 'acuerdo_pago' | 'otro';

export const TIPO_ACCION_LABEL: Record<TipoAccionCobranza, string> = {
  llamada: 'Llamada', email: 'Email', whatsapp: 'WhatsApp',
  aviso_legal: 'Aviso Legal', acuerdo_pago: 'Acuerdo de Pago', otro: 'Otro',
};

export type ResultadoAccionCobranza =
  | 'no_contesta' | 'promesa_pago' | 'rechazado' | 'pago_parcial'
  | 'pago_total' | 'negociando' | 'escalado';

export const RESULTADO_ACCION_LABEL: Record<ResultadoAccionCobranza, string> = {
  no_contesta: 'No contesta', promesa_pago: 'Promesa de pago',
  rechazado: 'Rechazado', pago_parcial: 'Pago parcial',
  pago_total: 'Pago total', negociando: 'Negociando', escalado: 'Escalado',
};

// ── Nested objects ────────────────────────────────────────────────────────────

export interface ContactoHistorialEntry {
  step: number;
  action: string;
  actionKey: string;
  date: string;
  notes: string | null;
  statusDate: string | null;
  promesaFecha: string | null;
  promesaImporte: number | null;
}

export interface PagoFraccionadoEntry {
  numero: number;
  importe: number;
  fecha: string;
  cobrado: boolean;
}

// ── Cliente deudor ────────────────────────────────────────────────────────────

export interface GestionImpagoCliente {
  id: string;
  nombre: string;
  empresa: string | null;
  nif: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  hubspotId: string | null;
  nivelRiesgo: NivelRiesgoGestionCliente;
  activo: boolean;
  notas: string | null;
  deudaTotal: number;
  createdAt: string;
  updatedAt: string;
}

export interface GestionImpagoClientePayload {
  nombre: string;
  empresa?: string | null;
  nif?: string | null;
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  hubspotId?: string | null;
  nivelRiesgo?: NivelRiesgoGestionCliente;
  activo?: boolean;
  notas?: string | null;
}

export interface GestionImpagoClienteFilter {
  q?: string;
}

// ── Impago ────────────────────────────────────────────────────────────────────

export interface GestionImpago {
  id: string;
  clienteId: string;
  clienteNombre: string | null;
  clienteNif: string | null;
  clienteEmpresa: string | null;
  nombreCliente: string | null;
  numeroFactura: string | null;
  importe: number;
  parcialPagado: number;
  importePendiente: number;
  moneda: string;
  fechaVencimiento: string | null;
  fechaDevolucion: string | null;
  estado: EstadoGestionImpago;
  prioridad: PrioridadGestionImpago;
  clienteActivo: string;
  descripcion: string | null;
  observaciones: string | null;
  colaborador: string | null;
  motivoDevolucion: string | null;
  hubspotDealId: string | null;
  contactoStep: number;
  contactoHistory: ContactoHistorialEntry[];
  lastActionDate: string | null;
  nextActionDate: string | null;
  corteAlertDate: string | null;
  skipCorteAlert: boolean;
  ovcCheck: boolean;
  ovcSubstatus: string | null;
  ovcStartDate: string | null;
  ovcPredemanda: boolean;
  ovcEnviado: boolean;
  demandaCheck: boolean;
  demandaPreparada: boolean;
  demandaEnviada: boolean;
  demandaM1: boolean;
  procesoJudicialGestionado: boolean;
  promesaFecha: string | null;
  promesaImporte: number | null;
  promesaCumplida: boolean;
  pagoFraccionado: boolean;
  numPagos: number | null;
  pagosFraccionados: PagoFraccionadoEntry[];
  burofaxAvisoCorte: boolean;
  asnef: boolean;
  diasVencido: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface GestionImpagoPayload {
  clienteId: string;
  numeroFactura?: string | null;
  importe?: number;
  parcialPagado?: number;
  moneda?: string;
  fechaVencimiento?: string | null;
  fechaDevolucion?: string | null;
  estado?: EstadoGestionImpago;
  prioridad?: PrioridadGestionImpago;
  clienteActivo?: string;
  descripcion?: string | null;
  observaciones?: string | null;
  colaborador?: string | null;
  motivoDevolucion?: string | null;
  hubspotDealId?: string | null;
  nextActionDate?: string | null;
  skipCorteAlert?: boolean;
  ovcCheck?: boolean;
  ovcSubstatus?: string | null;
  ovcStartDate?: string | null;
  ovcPredemanda?: boolean;
  demandaCheck?: boolean;
  demandaPreparada?: boolean;
  demandaEnviada?: boolean;
  procesoJudicialGestionado?: boolean;
  promesaFecha?: string | null;
  promesaImporte?: number | null;
  promesaCumplida?: boolean;
  pagoFraccionado?: boolean;
  numPagos?: number | null;
  burofaxAvisoCorte?: boolean;
  asnef?: boolean;
  demandaM1?: boolean;
}

export interface GestionImpagoFilter {
  q?: string;
  estado?: EstadoGestionImpago;
  clienteId?: string;
  startDate?: string;
  endDate?: string;
}

export interface GestionImpagoActualizarEstadoPayload {
  estado: EstadoGestionImpago;
  fechaEstado?: string | null;
  notas?: string | null;
}

export interface GestionImpagoRegistrarContactoPayload {
  actionKey: string;
  notes?: string | null;
  promesaFecha?: string | null;
  promesaImporte?: number | null;
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export interface GestionImpagoStats {
  deudaTotal: number;
  cobrado: number;
  tasaRecuperacion: number;
  countNuevo: number;        importeNuevo: number;
  countVaAPagar: number;     importeVaAPagar: number;
  countAcuerdoPago: number;  importeAcuerdoPago: number;
  countAvisoCorte: number;   importeAvisoCorte: number;
  countCortado: number;      importeCortado: number;
  countOvc: number;          importeOvc: number;
  countDemanda: number;      importeDemanda: number;
  countPagado: number;       importePagado: number;
  countRemesarNuevamente: number; importeRemesarNuevamente: number;
  countOtros: number;        importeOtros: number;
  // Antigüedad de deuda
  importe0a30: number;
  importe31a60: number;
  importe61a90: number;
  importe91a180: number;
  importeMas180: number;
  // Histórico mensual
  historicoMensual: { mes: string; impagos: number; cobrado: number }[];
}

// ── Acción de cobranza ────────────────────────────────────────────────────────

export interface GestionAccionCobranza {
  id: string;
  impagoId: string;
  clienteId: string | null;
  clienteNombre: string | null;
  tipoAccion: TipoAccionCobranza;
  resultado: ResultadoAccionCobranza | null;
  importeCobrado: number | null;
  notas: string | null;
  nextActionDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GestionAccionCobranzaPayload {
  tipoAccion: TipoAccionCobranza;
  resultado?: ResultadoAccionCobranza | null;
  importeCobrado?: number | null;
  notas?: string | null;
  nextActionDate?: string | null;
}
