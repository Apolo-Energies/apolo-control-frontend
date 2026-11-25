/** Estado de un correo del buzón de facturas de compra. */
export type EstadoBuzonCorreo = 'PROCESADO' | 'NO_PROCESADO' | 'DESCARTADO' | 'ERROR';

export const ESTADO_BUZON_CORREO_LABEL: Record<EstadoBuzonCorreo, string> = {
  PROCESADO: 'Procesado',
  NO_PROCESADO: 'No procesado',
  DESCARTADO: 'Descartado',
  ERROR: 'Error',
};

/** Correo (o PDF de un correo) leído del buzón. */
export interface VibraBuzonCorreo {
  id: string;
  fecha: string | null;
  remitente: string | null;
  asunto: string | null;
  comercializadora: string | null;
  estado: EstadoBuzonCorreo;
  motivo: string | null;
  facturaId: string | null;
  nombreArchivo: string | null;
  enlace: string | null;
  tienePdf: boolean;
  intentos: number;
  actualizado: string;
}

/** Configuración y última lectura del buzón. */
export interface VibraBuzonEstado {
  configurado: boolean;
  habilitado: boolean;
  buzon: string | null;
  cron: string;
  diasAtras: number;
  leyendo: boolean;
  ultimaLectura: string | null;
  ultimoResultado: string | null;
  ultimoDetalle: string | null;
  noProcesados: number;
  errores: number;
}
