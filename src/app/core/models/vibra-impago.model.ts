import { EstadoFacturaVibra } from './vibra-factura.model';

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
