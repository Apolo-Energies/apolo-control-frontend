import { ContractStatus } from './enums';

export interface Contract {
  id: string;
  idExterno: string | null;
  estado: ContractStatus;
  fechaEstado: string | null;
  fechaCreacion: string | null;
  fechaInicio: string | null;
  fechaFinPrevista: string | null;
  fechaFinReal: string | null;
  campana: string | null;
  servicio: string | null;
  descuento: number | null;
  clienteId: string;
  clienteNombre: string;
  clienteNif: string | null;
  clienteDelegacion: string | null;
  suministroId: string | null;
  cups: string | null;
  suministroTipo: string | null;
  suministroTarifa: string | null;
  provincia: string | null;
  margenBruto: number | null;
  margenNeto: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContractFilter {
  status?: ContractStatus;
  q?: string;
  startDate?: string;
  endDate?: string;
  motivoRechazo?: string;
}

export interface ContractPayload {
  clienteId: string;
  suministroId: string;
  campana?: string | null;
  servicio?: string | null;
  descuento?: number | null;
  fechaCreacion?: string | null;
  mesesPrevisto?: number | null;
  fechaInicio?: string | null;
  fechaFinPrevista?: string | null;
  estado?: ContractStatus | null;
  fechaEstado?: string | null;
}

export interface ChangeContractStatusPayload {
  estado: ContractStatus;
  fechaEstado?: string | null;
}
