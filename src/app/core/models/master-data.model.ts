import { Branch } from './branch.model';
import { Customer } from './customer.model';
import { Group } from './group.model';
import { Supply } from './supply.model';

export interface MasterDataResponse {
  clientes: Customer[];
  suministros: Supply[];
  grupos: Group[];
  delegaciones: Branch[];
  motivosRechazo: string[];
  lastUpdated: string;
  version: string;
  totalRecords: number;
}

/** Singleton record stored in the `meta` object-store of IndexedDB. */
export interface MasterDataMeta {
  key: 'master-data';
  lastUpdated: string;
  version: string;
  totalRecords: number;
  motivosRechazo: string[];
}

/** Response from GET /v1/master-data/metadata (lightweight check). */
export interface MasterDataMetadata {
  lastUpdated: string;
  version: string;
  totalRecords: number;
  clientesCount: number;
  suministrosCount: number;
  gruposCount: number;
  delegacionesCount: number;
}
