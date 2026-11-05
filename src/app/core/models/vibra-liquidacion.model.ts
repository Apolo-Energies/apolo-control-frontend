export interface VibraLiquidacion {
  id: string;
  fecha: string | null;
  titular: string | null;
  nifCif: string | null;
  email: string | null;
  telefono: string | null;
  colaborador: string | null;
  producto: string | null;
  consumo: number | null;
  liquidado: string | null;               // Energaze
  liquidacionColaborador: string | null;  // Pagado / No pagado
}

export interface VibraLiquidacionFilter {
  q?: string;
  colaborador?: string;
  liquidacionColaborador?: string;
}
