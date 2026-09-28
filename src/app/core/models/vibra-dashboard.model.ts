export interface VibraRankingItem {
  posicion: number;
  colaborador: string;
  contratos: number;
  consumoTotal: number;
  porcentajeDelTotal: number;
}

export interface VibraDashboard {
  totalContratos: number;
  consumoTotal: number;
  colaboradoresActivos: number;
  ranking: VibraRankingItem[];
}
