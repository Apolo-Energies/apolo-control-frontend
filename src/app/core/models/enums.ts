export type UserRole = 'admin' | 'comercial' | 'contabilidad' | 'operaciones';

export type ContractStatus =
  | 'previo'
  | 'para_estudio'
  | 'para_tramitar'
  | 'para_firma'
  | 'valido'
  | 'confirmado'
  | 'activo'
  | 'renovado'
  | 'finalizado'
  | 'baja'
  | 'ko'
  | 'desestimado'
  | 'anulado'
  | 'sin_estado';

export type SupplyType = 'E' | 'G' | 'OTRO';

export type OfferCategory = 'ESE' | 'NO_ESE' | 'PRO';

export type OfferPriceType = 'FIJO' | 'INDEXADO';

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Administrador',
  comercial: 'Comercial',
  contabilidad: 'Contabilidad',
  operaciones: 'Operaciones',
};

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  previo: 'Previo',
  para_estudio: 'Para estudio',
  para_tramitar: 'Para tramitar',
  para_firma: 'Para firma',
  valido: 'Válido',
  confirmado: 'Confirmado',
  activo: 'Activo',
  renovado: 'Renovado',
  finalizado: 'Finalizado',
  baja: 'Baja',
  ko: 'KO',
  desestimado: 'Desestimado',
  anulado: 'Anulado',
  sin_estado: 'Sin estado',
};

export const SUPPLY_TYPE_LABEL: Record<SupplyType, string> = {
  E: 'Electricidad',
  G: 'Gas',
  OTRO: 'Otro',
};

export const USER_ROLE_VALUES: readonly UserRole[] = [
  'admin',
  'comercial',
  'contabilidad',
  'operaciones',
] as const;

export const CONTRACT_STATUS_VALUES: readonly ContractStatus[] = [
  'previo',
  'para_estudio',
  'para_tramitar',
  'para_firma',
  'valido',
  'confirmado',
  'activo',
  'renovado',
  'finalizado',
  'baja',
  'ko',
  'desestimado',
  'anulado',
  'sin_estado',
] as const;

export const SUPPLY_TYPE_VALUES: readonly SupplyType[] = ['E', 'G', 'OTRO'] as const;
