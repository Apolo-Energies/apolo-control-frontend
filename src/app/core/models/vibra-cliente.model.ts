export type TipoClienteVibra = 'FISICA' | 'JURIDICA';
export type TipoSuministroVibra = 'LUZ' | 'GAS';

export const TIPO_CLIENTE_VIBRA_LABEL: Record<TipoClienteVibra, string> = { FISICA: 'Física', JURIDICA: 'Jurídica' };
export const TIPO_SUMINISTRO_VIBRA_LABEL: Record<TipoSuministroVibra, string> = { LUZ: 'Luz', GAS: 'Gas' };

export interface VibraClienteListItem {
  id: string;
  tipo: TipoClienteVibra;
  nif: string;
  nombre: string;
  telefono1: string | null;
  email: string | null;
  poblacion: string | null;
  provincia: string | null;
  suministros: number;
  dniRevisar: boolean;
}

export interface VibraSuministro {
  id: string;
  cups: string;
  tipo: TipoSuministroVibra;
  tarifaAcceso: string | null;
  direccion: string | null;
  cp: string | null;
  poblacion: string | null;
  provincia: string | null;
}

export interface VibraContratoCliente {
  id: string;
  cups: string | null;
  estado: string | null;
  comercializadora: string | null;
  colaborador: string | null;
  fechaFirma: string | null;
  fechaActivacion: string | null;
  fechaBaja: string | null;
}

/** Datos editables del cliente (formulario «Editar cliente» de Kilowy). */
export interface VibraClientePayload {
  tipo: TipoClienteVibra;
  nif: string;
  nombre: string;
  telefono1: string | null;
  telefono2: string | null;
  email: string | null;
  tipoVia: string | null;
  via: string | null;
  numero: string | null;
  escalera: string | null;
  piso: string | null;
  puerta: string | null;
  cp: string | null;
  poblacion: string | null;
  provincia: string | null;
  observaciones: string | null;
}

export interface VibraClienteFicha extends VibraClientePayload {
  id: string;
  fechaAlta: string;
  dniRevisar: boolean;
  deKilowy: boolean;
  suministros: VibraSuministro[];
  contratos: VibraContratoCliente[];
}

export type VibraSuministroPayload = Omit<VibraSuministro, 'id'>;

export interface ImportacionContador {
  creados: number;
  completados: number;
  sinCambios: number;
  aRevisar: number;
}

export interface ImportacionClientes {
  clientes: ImportacionContador;
  suministros: ImportacionContador;
  avisos: string[];
}

export interface VibraClienteFilter {
  q?: string;
  tipo?: TipoClienteVibra;
}
