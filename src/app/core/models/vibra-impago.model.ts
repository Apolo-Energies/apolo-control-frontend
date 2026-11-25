import { EstadoFacturaVibra } from './vibra-factura.model';

/** Estados del impago como Kilowy, más PAGADO (paga también la factura ligada). */
export type EstadoVibraImpago =
  | 'IMPAGADA' | 'PLAN_PAGOS' | 'ILOCALIZABLE' | 'BUROFAX' | 'RECLAMACION' | 'INCOBRABLE' | 'PAGADO';

export const ESTADO_VIBRA_IMPAGO_LABEL: Record<EstadoVibraImpago, string> = {
  IMPAGADA: 'Impagada',
  PLAN_PAGOS: 'Plan de pagos / fraccionada',
  ILOCALIZABLE: 'Ilocalizable',
  BUROFAX: 'Burofax enviado',
  RECLAMACION: 'En reclamación judicial',
  INCOBRABLE: 'Incobrable',
  PAGADO: 'Pagado',
};

export const ESTADO_VIBRA_IMPAGO_VALUES = Object.keys(ESTADO_VIBRA_IMPAGO_LABEL) as EstadoVibraImpago[];

export type ResultadoGestionImpagoVibra = 'REGIRO' | 'TRANSFERENCIA' | 'TARJETA' | 'PROMESA' | 'ILOCALIZABLE' | 'OTRO';

export const RESULTADO_GESTION_IMPAGO_LABEL: Record<ResultadoGestionImpagoVibra, string> = {
  REGIRO: 'Volver a girar',
  TRANSFERENCIA: 'Pagará por transferencia',
  TARJETA: 'Pagará con tarjeta',
  PROMESA: 'Promesa de pago',
  ILOCALIZABLE: 'Ilocalizable',
  OTRO: 'Otro',
};

export const RESULTADOS_GESTION_IMPAGO = Object.keys(RESULTADO_GESTION_IMPAGO_LABEL) as ResultadoGestionImpagoVibra[];

export interface VibraImpagoGestion {
  id: string;
  resultado: ResultadoGestionImpagoVibra;
  nota: string | null;
  telefono: string | null;
  volverLlamar: string | null;
  usuario: string | null;
  createdAt: string;
}

export interface VibraImpagoGestionPayload {
  resultado: ResultadoGestionImpagoVibra;
  nota?: string | null;
  telefono?: string | null;
  volverLlamar?: string | null;
}

export type MotivoAvisoImpago = 'ENVIADO' | 'PAGADO' | 'SIN_EMAIL' | 'ERROR_CORREO';

export interface VibraImpagoAviso {
  motivo: MotivoAvisoImpago;
  mensaje: string;
  avisadoAt: string | null;
}

export type ActivoBajaVibra = 'Activo' | 'Baja';

export const ACTIVO_BAJA_VALUES: ActivoBajaVibra[] = ['Activo', 'Baja'];

export interface VibraImpago {
  id: string;
  idExterno: string;
  cliente: string | null;
  factura: string | null;
  /** Factura de Control ligada (null si el nº no casa). */
  facturaId: string | null;
  facturaEstado: EstadoFacturaVibra | null;
  importe: number | null;
  fechaDevolucion: string | null;
  estado: EstadoVibraImpago;
  motivoDevolucion: string | null;
  activoBaja: string | null;
  colaborador: string | null;
  comentarios: string | null;
  avisadoAt: string | null;
  recargo: number | null;
  recargoFacturado: boolean;
  ultimaGestion: VibraImpagoGestion | null;
  gestiones: number;
  createdAt: string;
  updatedAt: string;
}

export interface VibraImpagoPayload {
  cliente: string;
  factura?: string | null;
  importe?: number | null;
  fechaDevolucion?: string | null;
  motivoDevolucion?: string | null;
  activoBaja?: string | null;
  colaborador?: string | null;
  comentarios?: string | null;
}

export interface CambiarEstadoVibraImpagoPayload {
  estado: EstadoVibraImpago;
}

export interface VibraImpagoFilter {
  q?: string;
  estado?: string;
  activoBaja?: string;
  colaborador?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

// ── Devoluciones del banco (PDF «Relación de impagados») ──────────────────────

/** Tamaño máximo del PDF del banco (como el backend). */
export const MAX_PDF_DEVOLUCIONES_BYTES = 10 * 1024 * 1024;

/** Textos de motivo de devolución SEPA, sugerencias al corregir una fila (copia de VibraDevolucionBancoParser.MOTIVOS_SEPA). */
export const MOTIVOS_DEVOLUCION_VIBRA: string[] = [
  'Saldo insuficiente', 'Cuenta bloqueada', 'Cuenta cancelada', 'Cuenta incorrecta', 'Mandato no válido',
  'Datos del mandato incorrectos', 'Devuelto a petición del cliente', 'Rechazado por el cliente',
  'Deudor fallecido', 'Operación no permitida en la cuenta', 'Adeudo duplicado', 'Motivo no especificado',
  'Motivo regulatorio',
];

export interface VibraDevolucionFacturaCasada {
  id: string;
  numero: string;
  estado: EstadoFacturaVibra;
  total: number | null;
  titular: string | null;
}

export interface VibraDevolucionFilaLeida {
  indice: number;
  titular: string | null;
  ibanEnmascarado: string | null;
  importe: number;
  vencimiento: string | null;
  facturaLeida: string | null;
  motivoCodigo: string | null;
  motivo: string | null;
  factura: VibraDevolucionFacturaCasada | null;
  /** NUMERO, IMPORTE_TITULAR o null (sin casar). */
  casadaPor: 'NUMERO' | 'IMPORTE_TITULAR' | null;
  advertencias: string[];
}

export interface VibraDevolucionLeida {
  archivo: string;
  sha256: string;
  /** Firma de la cabecera: se devuelve tal cual al aplicar. */
  firma: string;
  fechaLiquidacion: string | null;
  adeudosDeclarados: number | null;
  totalDeclarado: number | null;
  sumaLeida: number;
  cuadra: boolean;
  avisos: string[];
  filas: VibraDevolucionFilaLeida[];
}

export interface VibraDevolucionAplicarFila {
  titular: string | null;
  ibanEnmascarado: string | null;
  importe: number;
  vencimiento: string | null;
  facturaNumero: string | null;
  motivoCodigo: string | null;
  motivo: string | null;
  aplicar: boolean;
}

export interface VibraDevolucionAplicarPayload {
  sha256: string;
  firma: string;
  archivo: string;
  fechaLiquidacion: string | null;
  adeudosDeclarados: number | null;
  totalDeclarado: number | null;
  confirmar: boolean;
  filas: VibraDevolucionAplicarFila[];
}

export type ResultadoDevolucionVibra = 'MARCADA' | 'YA_DEVUELTA' | 'SIN_CASAR' | 'DESCARTADA';

export const RESULTADO_DEVOLUCION_VIBRA_LABEL: Record<ResultadoDevolucionVibra, string> = {
  MARCADA: 'Marcada devuelta', YA_DEVUELTA: 'Ya devuelta', SIN_CASAR: 'Sin casar', DESCARTADA: 'Descartada',
};

export interface VibraDevolucionLinea {
  orden: number;
  titular: string | null;
  ibanEnmascarado: string | null;
  importe: number | null;
  vencimiento: string | null;
  facturaNumero: string | null;
  facturaId: string | null;
  motivoCodigo: string | null;
  motivo: string | null;
  resultado: ResultadoDevolucionVibra;
  detalle: string | null;
}

export interface VibraDevolucionLote {
  id: string;
  archivo: string;
  fechaLiquidacion: string | null;
  adeudos: number | null;
  importeTotal: number | null;
  sumaLeida: number;
  cuadra: boolean;
  marcadas: number;
  sinCasar: number;
  usuario: string | null;
  createdAt: string;
  lineas: VibraDevolucionLinea[];
}
