export type EstadoPago = 'pendiente' | 'pagado' | 'cancelado';
export type TipoPago = 'comision' | 'liquidacion' | 'bonus' | 'multa' | 'penalizacion' | 'otro';
export type FormaPago = 'factura' | 'pago_unico';

export const ESTADO_PAGO_LABEL: Record<EstadoPago, string> = {
  pendiente: 'Pendiente',
  pagado: 'Pagado',
  cancelado: 'Cancelado',
};

export const TIPO_PAGO_LABEL: Record<TipoPago, string> = {
  comision: 'Comisión',
  liquidacion: 'Liquidación',
  bonus: 'Bonus',
  multa: 'Multa',
  penalizacion: 'Penalización',
  otro: 'Otro',
};

export const FORMA_PAGO_LABEL: Record<FormaPago, string> = {
  factura: 'Factura',
  pago_unico: 'Pago único',
};

export const ESTADO_PAGO_VALUES: EstadoPago[] = ['pendiente', 'pagado', 'cancelado'];
export const TIPO_PAGO_VALUES: TipoPago[] = ['comision', 'liquidacion', 'bonus', 'multa', 'penalizacion', 'otro'];
export const FORMA_PAGO_VALUES: FormaPago[] = ['factura', 'pago_unico'];

export interface PagoLiquidacion {
  id: string;
  delegacionId: string | null;
  delegacionNombre: string | null;
  colaboradorNombre: string;
  numeroCuenta: string | null;
  emailColaborador: string | null;
  concepto: string;
  importe: number;
  importePenalizacion: number;
  importeNeto: number;
  conceptoPenalizacion: string | null;
  tipo: TipoPago;
  formaPago: FormaPago | null;
  estado: EstadoPago;
  fechaLiquidacion: string | null;
  mesLiquidacion: number | null;
  anioLiquidacion: number | null;
  fechaPago: string | null;
  referencia: string | null;
  comentarios: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PagoLiquidacionFilter {
  delegacionId?: string;
  estado?: EstadoPago | '';
  tipo?: TipoPago | '';
  startDate?: string;
  endDate?: string;
  q?: string;
}

export interface PagoLiquidacionPayload {
  delegacionId?: string | null;
  colaboradorNombre: string;
  numeroCuenta?: string | null;
  emailColaborador?: string | null;
  concepto: string;
  importe: number;
  importePenalizacion?: number | null;
  conceptoPenalizacion?: string | null;
  tipo: TipoPago;
  formaPago?: FormaPago | null;
  estado?: EstadoPago | null;
  fechaLiquidacion?: string | null;
  mesLiquidacion?: number | null;
  anioLiquidacion?: number | null;
  fechaPago?: string | null;
  referencia?: string | null;
  comentarios?: string | null;
}
