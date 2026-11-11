export type EstadoPago = 'pendiente' | 'pagado' | 'cancelado';
export type TipoPago = 'comision' | 'liquidacion' | 'bonus' | 'multa' | 'penalizacion' | 'adelanto' | 'diferencia' | 'embargo' | 'otro';
export type FormaPago = 'factura' | 'pago_unico';
export type Empresa = 'APOLO_GAS' | 'VIBRA' | 'APOLO';

export const EMPRESA_LABEL: Record<Empresa, string> = {
  APOLO_GAS: 'Apolo Gas',
  VIBRA: 'Vibra',
  APOLO: 'Apolo',
};

export const EMPRESA_VALUES: Empresa[] = ['APOLO_GAS', 'VIBRA', 'APOLO'];

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
  adelanto: 'Adelanto',
  diferencia: 'Diferencia',
  embargo: 'Embargo',
  otro: 'Otro',
};

export const FORMA_PAGO_LABEL: Record<FormaPago, string> = {
  factura: 'Factura',
  pago_unico: 'Pago único',
};

export const ESTADO_PAGO_VALUES: EstadoPago[] = ['pendiente', 'pagado', 'cancelado'];
export const TIPO_PAGO_VALUES: TipoPago[] = ['liquidacion', 'multa', 'penalizacion', 'adelanto', 'diferencia', 'embargo', 'otro'];
export const FORMA_PAGO_VALUES: FormaPago[] = ['factura', 'pago_unico'];

export interface PagoLiquidacion {
  id: string;
  numero: string;
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
  empresa: Empresa | null;
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

/** Totales de todo el filtro (servidor), no de la página. */
export interface PagoLiquidacionTotales {
  registros: number;
  importe: number;
  penalizacion: number;
  neto: number;
  pendiente: number;
}

export interface PagoLiquidacionFilter {
  delegacionId?: string;
  estado?: EstadoPago | '';
  tipo?: TipoPago | '';
  empresa?: Empresa | '';
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
  empresa?: Empresa | null;
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
