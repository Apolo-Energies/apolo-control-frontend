export interface TarifaPenalizacion {
  id: string;
  nombre: string;
  pctPenalizacion: number;
  precioMega: number;
  diasPrevioAviso: number;
  recargoSinAviso: number;
  activa: boolean;
}

export interface TarifaPenalizacionPayload {
  nombre: string;
  pctPenalizacion: number;
  precioMega: number;
  diasPrevioAviso: number;
  recargoSinAviso: number;
  activa?: boolean;
}

export interface CalculoPenalizacionRequest {
  tarifaId: string;
  fechaInicio: string;
  fechaBaja: string;
  tienePrevioAviso: boolean;
  consumo12m: number;
}

export interface CalculoPenalizacionResponse {
  diasPendientes: number;
  consumo12m: number;
  precioMega: number;
  pctPenalizacion: number;
  basePenalizacion: number;
  recargo: number;
  totalSugerido: number;
  diasPrevioAviso: number;
  /** Penalización con preaviso (sin recargo = basePenalizacion). */
  totalConPreaviso: number;
  /** Penalización sin preaviso (basePenalizacion + 50%). */
  totalSinPreaviso: number;
}
