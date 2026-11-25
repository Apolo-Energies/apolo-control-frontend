export type EstadoFacturaVibra = 'BORRADOR' | 'EMITIDA' | 'PAGADA' | 'IMPAGADA' | 'DEVUELTA';
export type ZonaLineaFacturaVibra = 'ANTES' | 'DESPUES';
export type TipoLineaFacturaVibra = 'POTENCIA' | 'ENERGIA' | 'OTRO';

export const ESTADO_FACTURA_VIBRA_LABEL: Record<EstadoFacturaVibra, string> = {
  BORRADOR: 'Borrador', EMITIDA: 'Emitida', PAGADA: 'Pagada', IMPAGADA: 'Impagada', DEVUELTA: 'Devuelta',
};

/** Tamaño máximo del PDF de compra (copia de VibraFacturaCompraService.MAX_BYTES). */
export const MAX_PDF_COMPRA_BYTES = 10 * 1024 * 1024;

/** IVA de un concepto extra: 21, 10, 5, 0 o null (no sujeto). */
export const IVAS_FACTURA_VIBRA: (number | null)[] = [21, 10, 5, 0, null];

export interface VibraFacturaListItem {
  id: string;
  numero: string | null;
  estado: EstadoFacturaVibra;
  titular: string | null;
  nif: string | null;
  contrato: string | null;
  cups: string;
  tarifaAcceso: string | null;
  periodoDesde: string;
  periodoHasta: string;
  fechaEmision: string | null;
  total: number;
  margen: number | null;
  margenPct: number | null;
  compraComercializadora: string | null;
  enviadaAt: string | null;
  avisos: number;
  /** Importada de Kilowy: sin PDF ni envío desde Control. */
  deKilowy: boolean;
  createdAt: string;
}

/** Claves: TODAS, BORRADOR…DEVUELTA, SIN_ENVIAR, ENVIADA. */
export type VibraFacturaConteos = Record<string, number>;

export interface VibraFacturaFilter {
  estado?: EstadoFacturaVibra;
  envio?: 'si' | 'no';
  q?: string;
  desde?: string;
  hasta?: string;
  importe?: number;
}

export interface VibraFacturaLinea {
  id: string;
  tipo: TipoLineaFacturaVibra;
  concepto: string;
  detalle: string | null;
  cantidad: number | null;
  precio: number | null;
  importe: number;
  zona: ZonaLineaFacturaVibra;
  ivaPct: number | null;
  origen: 'AUTO' | 'MANUAL';
}

export interface VibraFacturaTramoIva {
  pct: number | null;
  base: number;
  cuota: number;
}

export interface VibraFactura {
  id: string;
  estado: EstadoFacturaVibra;
  numero: string | null;
  altaId: string | null;
  contrato: string | null;
  titular: string | null;
  nif: string | null;
  direccion: string | null;
  direccionSuministro: string | null;
  email: string | null;
  cups: string;
  tarifaAcceso: string | null;
  producto: string | null;
  ibanEnmascarado: string | null;
  periodoDesde: string;
  periodoHasta: string;
  dias: number;
  potencias: (number | null)[];
  consumos: (number | null)[];
  fechaEmision: string | null;
  fechaCobro: string | null;
  fechaPago: string | null;
  fechaDevolucion: string | null;
  motivoDevolucion: string | null;
  enviadaAt: string | null;
  iePct: number;
  totalPotencia: number;
  totalEnergia: number;
  totalOtros: number;
  baseIe: number;
  impuestoElectrico: number;
  subtotal: number;
  tramosIva: VibraFacturaTramoIva[];
  baseIva: number;
  iva: number;
  total: number;
  compraComercializadora: string | null;
  compraTotal: number | null;
  compraFechaEmision: string | null;
  compraPdfNombre: string | null;
  margen: number | null;
  margenPct: number | null;
  avisos: string[];
  deKilowy: boolean;
  /** Importada con su PDF de Kilowy guardado en Control. */
  pdfKilowy: boolean;
  lineas: VibraFacturaLinea[];
  createdAt: string;
}

export interface VibraFacturaLineaPayload {
  concepto: string;
  importe: number;
  zona: ZonaLineaFacturaVibra;
  ivaPct: number | null;
}

export interface ResultadoCompraVibra {
  archivo: string;
  facturaId: string | null;
  titular: string | null;
  cups: string | null;
  error: string | null;
}

/** Resumen de la importación de facturas de Kilowy. */
export interface KilowyFacturasImportResult {
  creadas: number;
  actualizadas: number;
  sinCambios: number;
  cambiadasEnControl: number;
  omitidas: number;
  ultimaSecuencia: number;
  avisos: string[];
}

/** Resumen de «Enviar las sin enviar» (como mucho 50 por llamada). */
export interface VibraEnvioFacturasResult {
  enviadas: number;
  /** Otro envío se adelantó. */
  yaEnviadas: number;
  sinEmail: string[];
  errores: { numero: string; mensaje: string }[];
  /** Con email que quedan para la siguiente llamada. */
  pendientes: number;
}

/** Facturas de Control emitidas sin enviar. */
export interface VibraEnvioPendientes {
  conEmail: number;
  sinEmail: number;
}
