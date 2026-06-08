import { ContractStatus } from './enums';

export interface ContractsSummary {
  total: number;
  porEstado: Partial<Record<ContractStatus, number>>;
  consumoContratoMwhPorEstado: Partial<Record<ContractStatus, number>>;
  consumoAnualMwhPorEstado: Partial<Record<ContractStatus, number>>;
}

export interface CustomersSummary {
  total: number;
  activos: number;
}

export interface SuppliesSummary {
  total: number;
  activos: number;
  electricidad: number;
  gas: number;
}

export interface MarginsSummary {
  totalBruto: number;
  totalNeto: number;
  promedioMargenBeneficioPct: number;
}

export interface RankingItem {
  nombre: string;
  total: number;
  fechaUltimoContrato: string;
  antiguedadDias: number;
  totalMwh: number;
}

export interface MonthlyConsumption {
  mes: string;
  consumoMwh: number;
  totalContratos: number;
}

export interface DashboardSummary {
  contratos: ContractsSummary;
  clientes: CustomersSummary;
  suministros: SuppliesSummary;
  margenes: MarginsSummary;
  topDelegaciones: RankingItem[];
  kosPorMotivo: Record<string, number>;
  consumoMensualBruto: MonthlyConsumption[];
  consumoMensualActivo: MonthlyConsumption[];
}

export interface DashboardFilter {
  startDate?: string;
  endDate?: string;
}
