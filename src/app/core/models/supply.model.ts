import { SupplyType } from './enums';

export interface Supply {
  id: string;
  cups: string;
  activo: boolean;
  tipo: SupplyType;
  tarifa: string | null;
  clienteId: string;
  clienteNombre: string;
  clienteNif: string | null;
  provincia: string | null;
  poblacion: string | null;
  codigoPostal: string | null;
  consumoUltimos12Meses: number | null;
  consumoContrato: number | null;
  potenciaP1: number | null;
  potenciaP2: number | null;
  potenciaP3: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupplyFilter {
  cups?: string;
  activeOnly?: boolean;
}

export interface SupplyPayload {
  clienteId: string;
  cups: string;
  activo?: boolean;
  tipo?: SupplyType;
  tarifa?: string | null;
  consumoContrato?: number | null;
  consumoUltimos12Meses?: number | null;
  direccion?: string | null;
  codigoPostal?: string | null;
  provincia?: string | null;
  poblacion?: string | null;
  potenciaP1?: number | null;
  potenciaP2?: number | null;
  potenciaP3?: number | null;
}
