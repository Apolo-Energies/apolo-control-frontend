export interface BajaPayload {
  contratoId: string;
  feedbackCliente?: string | null;
  tienePenalizacion: boolean;
  montoLiquidacion?: number | null;
  fechaBaja?: string | null;
}

export interface BajaUpdatePayload {
  feedbackCliente?: string | null;
  tienePenalizacion: boolean;
  montoLiquidacion?: number | null;
  fechaBaja?: string | null;
}

export interface DelegacionBajaStats {
  delegacionNombre: string;
  totalBajas: number;
  totalConsumo: number;
}
