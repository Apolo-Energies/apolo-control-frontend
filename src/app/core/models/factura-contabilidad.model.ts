import { Page } from './page.model';

export type FacturaContabilidadEstado = 'enviado_a_pago' | 'cobrado_en_cuenta' | 'pagado';

export const FACTURA_ESTADO_LABEL: Record<FacturaContabilidadEstado, string> = {
  enviado_a_pago: 'Enviado a pago',
  cobrado_en_cuenta: 'Cobrado en cuenta',
  pagado: 'Pagado',
};

export const FACTURA_ESTADO_VALUES: FacturaContabilidadEstado[] = [
  'enviado_a_pago',
  'cobrado_en_cuenta',
  'pagado',
];

export interface FacturaContabilidadResumen {
  pendientePago: number;
  totalPagado: number;
  vencidasSinPagar: number;
}

export interface FacturaContabilidad {
  id: string;
  fechaFactura: string;
  numeroFactura: string | null;
  proveedor: string;
  cifProveedor: string | null;
  concepto: string | null;
  baseImponible: number;
  ivaPct: number;
  total: number;
  estado: FacturaContabilidadEstado;
  fechaVencimiento: string | null;
  transferencia: boolean;
  fechaPago: string | null;
  delegacionId: string | null;
  delegacionNombre: string | null;
  comentarios: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FacturaContabilidadResponse {
  resumen: FacturaContabilidadResumen;
  detalle: Page<FacturaContabilidad>;
}

export interface FacturaContabilidadFilter {
  delegacionId?: string;
  estado?: FacturaContabilidadEstado | '';
  startDate?: string;
  endDate?: string;
  q?: string;
}

export interface FacturaContabilidadPayload {
  fechaFactura: string;
  numeroFactura?: string | null;
  proveedor: string;
  cifProveedor?: string | null;
  concepto?: string | null;
  baseImponible: number;
  ivaPct: number;
  total: number;
  estado: FacturaContabilidadEstado;
  fechaVencimiento?: string | null;
  transferencia?: boolean;
  fechaPago?: string | null;
  delegacionId?: string | null;
  comentarios?: string | null;
}
