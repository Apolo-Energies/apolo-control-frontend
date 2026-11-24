import { EstadoFacturaVibra } from './vibra-factura.model';

export type TipoRemesaVibra = 'EMITIDAS' | 'IMPAGADOS';
export type EstadoRemesaVibra = 'GENERADA' | 'COBRADA' | 'ANULADA';
export type ResultadoReciboVibra = 'EN_BANCO' | 'COBRADO' | 'DEVUELTO' | 'ANULADO';

export const TIPO_REMESA_VIBRA_LABEL: Record<TipoRemesaVibra, string> = {
  EMITIDAS: 'Facturas emitidas', IMPAGADOS: 'Regiro de impagados',
};
export const ESTADO_REMESA_VIBRA_LABEL: Record<EstadoRemesaVibra, string> = {
  GENERADA: 'En el banco', COBRADA: 'Cobrada', ANULADA: 'Anulada',
};
export const RESULTADO_RECIBO_VIBRA_LABEL: Record<ResultadoReciboVibra, string> = {
  EN_BANCO: 'En el banco', COBRADO: 'Cobrado', DEVUELTO: 'Devuelto', ANULADO: 'Anulado',
};

/** Factura que puede ir en una remesa. cuenta: IBAN del cliente enmascarado. */
export interface VibraRemesaCobrable {
  facturaId: string;
  numero: string;
  estado: EstadoFacturaVibra;
  titular: string | null;
  nif: string | null;
  contrato: string | null;
  cuenta: string;
  importe: number;
  fechaEmision: string | null;
  fechaDevolucion: string | null;
  motivoDevolucion: string | null;
  intento: number;
}

/** fechaCobro null en el regiro (la elige el usuario). */
export interface VibraRemesaGrupo {
  fechaCobro: string | null;
  recibos: number;
  importe: number;
  facturas: VibraRemesaCobrable[];
}

export interface VibraRemesaExcluida {
  facturaId: string;
  numero: string;
  estado: EstadoFacturaVibra;
  titular: string | null;
  contrato: string | null;
  importe: number;
  motivo: string;
}

export interface VibraRemesaPendientes {
  grupos: VibraRemesaGrupo[];
  excluidas: VibraRemesaExcluida[];
}

export interface VibraRemesaListItem {
  id: string;
  numero: number;
  tipo: TipoRemesaVibra;
  estado: EstadoRemesaVibra;
  fechaCobro: string;
  recibos: number;
  importe: number;
  /** Cuenta de Vibra enmascarada. */
  cuenta: string;
  creadaPorNombre: string | null;
  createdAt: string;
}

export interface VibraRemesaRecibo {
  facturaId: string;
  factura: string;
  estadoFactura: EstadoFacturaVibra;
  titular: string | null;
  nif: string | null;
  contrato: string | null;
  cuenta: string;
  importe: number;
  intento: number;
  resultado: ResultadoReciboVibra;
}

export interface VibraRemesa extends VibraRemesaListItem {
  cobradaAt: string | null;
  anuladaAt: string | null;
  enBanco: number;
  cobrados: number;
  devueltos: number;
  lineas: VibraRemesaRecibo[];
}

export interface GenerarRemesaPayload {
  tipo: TipoRemesaVibra;
  fechaCobro: string;
  facturaIds: string[];
}
