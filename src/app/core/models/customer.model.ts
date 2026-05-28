export interface Customer {
  id: string;
  nombre: string;
  nif: string | null;
  grupoId: string | null;
  grupoNombre: string | null;
  delegacionId: string | null;
  delegacionNombre: string | null;
  nifTitular: string | null;
  titular: string | null;
  telefonoTitular: string | null;
  contacto: string | null;
  telefonoContacto: string | null;
  email: string | null;
  telefono: string | null;
  iban: string | null;
  cnae: string | null;
  actividad: string | null;
  comercial: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerFilter {
  q?: string;
  activeOnly?: boolean;
}

export interface CustomerPayload {
  nombre: string;
  nif?: string | null;
  grupoId?: string | null;
  delegacionId?: string | null;
  nifTitular?: string | null;
  titular?: string | null;
  telefonoTitular?: string | null;
  contacto?: string | null;
  telefonoContacto?: string | null;
  email?: string | null;
  telefono?: string | null;
  iban?: string | null;
  mandato?: string | null;
  cnae?: string | null;
  actividad?: string | null;
  comercial?: string | null;
  activo?: boolean;
}
