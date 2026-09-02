// ── Enums / union types ──────────────────────────────────────────────────────

export type EstadoGestionImpago =
  | 'nuevo'
  | 'va_a_pagar'
  | 'aviso_corte'
  | 'cortado'
  | 'ovc'
  | 'predemanda'
  | 'demanda'
  | 'juicio'
  | 'pagado'
  | 'remesar_nuevamente'
  | 'credit_back'
  | 'perdidos'
  | 'otros';

export const ESTADO_GESTION_IMPAGO_VALUES: EstadoGestionImpago[] = [
  'nuevo', 'va_a_pagar', 'aviso_corte', 'cortado',
  'ovc', 'predemanda', 'demanda', 'juicio', 'pagado',
  'remesar_nuevamente', 'credit_back', 'perdidos', 'otros',
];

export const ESTADO_GESTION_IMPAGO_LABEL: Record<EstadoGestionImpago, string> = {
  nuevo: 'Nuevo',
  va_a_pagar: 'Acuerdo Verbal',
  aviso_corte: 'Aviso de Corte',
  cortado: 'Cortado',
  ovc: 'Acuerdo Formal OVC',
  predemanda: 'Pre-demanda',
  demanda: 'Demanda',
  juicio: 'Juicio',
  pagado: 'Cobrado',
  remesar_nuevamente: 'Remesar nuevamente',
  credit_back: 'Credit Back',
  perdidos: 'Perdidos',
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
  emailEstado?: 'enviado' | 'fallido' | 'sin_email' | 'sin_factura_ee' | null;
  emailDestinatario?: string | null;
  emailUsuario?: string | null;
}

export interface PagoFraccionadoEntry {
  numero: number;
  importe: number;
  fecha: string;
  cobrado: boolean;
  /** Fecha real en que se marcó como cobrada (puede diferir del vencimiento). */
  fechaPago?: string;
  descartado?: boolean;
}

export interface PagoHistorialEntry {
  fecha: string;
  importe: number;
  tipo: 'parcial' | 'total';
  notas: string | null;
}

export interface NotaEntry {
  contenido: string;
  fecha: string;
}

export interface DemandaDocumento {
  nombre: string;
  url: string;
  fechaSubida: string;
  tamano?: number;
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
  delegacionId: string | null;
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
  fechaPago: string | null;
  pagosHistorial: PagoHistorialEntry[];
  burofaxAvisoCorte: boolean;
  asnef: boolean;
  diasVencido: number | null;
  fechaEnvioDemanda: string | null;
  cantidadDemandada: number | null;
  abogadoResponsable: string | null;
  documentosAdjuntos: DemandaDocumento[];
  notasBitacora: NotaEntry[];
  createdAt: string;
  updatedAt: string;
  fechaUltimoEstado: string | null;
}

export interface HistorialEstadoImpago {
  id: string;
  usuarioId: string | null;
  usuarioNombre: string | null;
  estadoAnterior: EstadoGestionImpago | null;
  estadoNuevo: EstadoGestionImpago;
  fechaCambio: string;
}

export interface GestionImpagoPayload {
  clienteId: string;
  delegacionId?: string | null;
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
  clienteActivo?: string;
  pagadoFilter?: 'pagado' | 'no_pagado';
  delegacionId?: string;
  pagoFraccionado?: boolean;
  soloVencidos?: boolean;
}

export interface RegistrarPagoPayload {
  fecha: string;
  importe: number;
  notas?: string | null;
}

export interface GestionImpagoActualizarEstadoPayload {
  estado: EstadoGestionImpago;
  fechaEstado?: string | null;
  notas?: string | null;
  importe?: number | null;
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
  countAvisoCorte: number;   importeAvisoCorte: number;
  countCortado: number;      importeCortado: number;
  countOvc: number;          importeOvc: number;
  countDemanda: number;      importeDemanda: number;
  countPagado: number;       importePagado: number;
  countRemesarNuevamente: number; importeRemesarNuevamente: number;
  countCreditBack: number;   importeCreditBack: number;
  countPerdidos: number;     importePerdidos: number;
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

// ── Totales filtrados ────────────────────────────────────────────────────────

export interface GestionImpagoTotales {
  totalImporte: number;
  totalPendiente: number;
  totalRegistros: number;
}

// ── Estadísticas avanzadas ────────────────────────────────────────────────────

export interface MotivoDevolucionItem {
  motivo: string;
  count: number;
  porcentaje: number;
}

export interface ClienteRecurrenteItem {
  clienteId: string;
  nombreCliente: string | null;
  totalImpagos: number;
  pagados: number;
}

export interface DelegacionEstadoItem {
  delegacionId: string | null;
  estado: string;
  count: number;
}

export interface GestionEstadisticas {
  mediaHorasPrimerContacto: number | null;
  mediaHorasRecuperacion: number | null;
  countMenos1000: number;
  countMasOIgual1000: number;
  totalImpagos: number;
  pctContactosMenos24h: number | null;
  totalConContacto: number;
  motivosDevolucion: MotivoDevolucionItem[];
  clientesConMasDeUnImpago: number;
  clientesRecurrentes: ClienteRecurrenteItem[];
  mediaContactosHastaPago: number | null;
  porDelegacion: DelegacionEstadoItem[];
  // Antigüedad por días desde creación (no pagados)
  count0a15: number;
  count16a30: number;
  count31a60: number;
  count61a180: number;
  count181a360: number;
  countMas360: number;
  importe0a15: number;
  importe16a30: number;
  importe31a60: number;
  importe61a180: number;
  importe181a360: number;
  importeMas360: number;
  // Distribución de recuperación (pagados)
  countRecup0a7: number;
  countRecup8a30: number;
  countRecupMas30: number;
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
