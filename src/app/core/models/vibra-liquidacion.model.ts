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
  liquidado: string | null;
  liquidacionColaborador: number | null;
}

export interface VibraLiquidacionFilter {
  q?: string;
  colaborador?: string;
  liquidado?: string;
}
