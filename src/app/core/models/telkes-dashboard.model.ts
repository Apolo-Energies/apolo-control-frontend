export interface TelkesRankingItem {
  posicion: number;
  colaborador: string;
  contratos: number;
  consumoTotal: number;
  porcentajeDelTotal: number;
}

export interface TelkesDashboard {
  totalContratos: number;
  consumoTotal: number;
  colaboradoresActivos: number;
  ranking: TelkesRankingItem[];
}

export interface CambiarEstadoTelkesAltaPayload {
  estado: string;
}

export interface TelkesGestionadoPayload {
  gestionado: boolean;
}

export interface TelkesLiquidadoPayload {
  liquidado: string;
}
