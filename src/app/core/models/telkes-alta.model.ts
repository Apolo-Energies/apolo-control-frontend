export type EstadoTelkesAlta = 'FIRMADO' | 'BAJA' | 'CANCELADO' | 'Pendiente';

export const ESTADO_TELKES_ALTA_VALUES: EstadoTelkesAlta[] = [
  'FIRMADO', 'BAJA', 'CANCELADO', 'Pendiente',
];

export type ComercializadoraTelkes = 'ENDESA' | 'APOLO 2.0' | 'APOLO 3.0' | 'CARLOS' | 'IBERDROLA';

export const COMERCIALIZADORA_TELKES_VALUES: ComercializadoraTelkes[] = [
  'ENDESA', 'APOLO 2.0', 'APOLO 3.0', 'CARLOS', 'IBERDROLA',
];

export interface TelkesAlta {
  id: string;
  idExterno: string;

  cups: string | null;
  titular: string | null;
  nifCif: string | null;

  direccionSuministro: string | null;
  poblacion: string | null;
  provincia: string | null;

  telefono: string | null;
  email: string | null;
  cuentaBancaria: string | null;

  comercializadora: string | null;
  estado: string | null;
  consumo: number | null;

  fecha: string | null;
  fechaTramitacion: string | null;
  fechaRenovacion: string | null;
  fechaFirma: string | null;
  fechaCambioComercializadora: string | null;
  fechaActivacionContrato: string | null;

  colaborador: string | null;
  mesLiquidacion: string | null;

  potenciaOriginal: string | null;
  potenciaP1: number | null;
  potenciaP2: number | null;
  potenciaP3: number | null;
  potenciaP4: number | null;
  potenciaP5: number | null;
  potenciaP6: number | null;

  tramitado: boolean | null;
  gestionado: boolean;
  liquidado: string | null;
  liquidacionColaborador: number | null;
  historialLiquidaciones: string | null;
  comentarios: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface TelkesAltaPayload {
  titular: string;
  cups?: string | null;
  nifCif?: string | null;
  direccionSuministro?: string | null;
  poblacion?: string | null;
  provincia?: string | null;
  telefono?: string | null;
  email?: string | null;
  cuentaBancaria?: string | null;
  comercializadora?: string | null;
  estado?: string | null;
  consumo?: number | null;
  fecha?: string | null;
  fechaTramitacion?: string | null;
  fechaRenovacion?: string | null;
  fechaFirma?: string | null;
  fechaCambioComercializadora?: string | null;
  fechaActivacionContrato?: string | null;
  colaborador?: string | null;
  mesLiquidacion?: string | null;
  potenciaOriginal?: string | null;
  potenciaP1?: number | null;
  potenciaP2?: number | null;
  potenciaP3?: number | null;
  potenciaP4?: number | null;
  potenciaP5?: number | null;
  potenciaP6?: number | null;
  tramitado?: boolean | null;
  liquidado?: string | null;
  liquidacionColaborador?: number | null;
  historialLiquidaciones?: string | null;
  comentarios?: string | null;
}

export interface TelkesAltaFilter {
  q?: string;
  estado?: string;
  colaborador?: string;
  comercializadora?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface TelkesDashboardStats {
  totalAltas: number;
  totalTarifas: number;
  consumoTotal: number;
  colaboradoresActivos: number;
}
