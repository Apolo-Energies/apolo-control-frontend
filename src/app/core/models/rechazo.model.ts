export type RechazoEstado = 'rechazado' | 'incidencia' | 'activo';
export type RechazoResultado = 'tramitado_de_nuevo' | 'resuelta' | 'ko' | 'gestionado';
export type PlataformaRechazo = 'ENERGY_EXPERT' | 'RENOVAE' | 'OTRO';

export const PLATAFORMA_LABEL: Record<PlataformaRechazo, string> = {
  ENERGY_EXPERT: 'Energy Expert',
  RENOVAE: 'Renovae',
  OTRO: 'Otro',
};

export const RECHAZO_ESTADO_LABEL: Record<RechazoEstado, string> = {
  rechazado: 'Rechazado',
  incidencia: 'Incidencia',
  activo: 'Activo',
};

export const RECHAZO_RESULTADO_LABEL: Record<RechazoResultado, string> = {
  tramitado_de_nuevo: 'Tramitado de nuevo',
  resuelta: 'Resuelta',
  ko: 'KO',
  gestionado: 'Gestionado',
};

export const RECHAZO_ESTADO_VALUES: RechazoEstado[] = ['rechazado', 'incidencia', 'activo'];
export const RECHAZO_RESULTADO_VALUES: RechazoResultado[] = ['tramitado_de_nuevo', 'resuelta', 'ko', 'gestionado'];

export interface RechazoComentario {
  id: string;
  texto: string;
  autor: string;
  fecha: string;
}

export interface RechazoAnexoInfo {
  id: string;
  nombreArchivo: string;
  tipoContenido: string;
  tamanio: number;
}

export interface Rechazo {
  id: string;
  contratoId: string | null;
  contratoIdExterno: string | null;
  clienteId: string | null;
  clienteNombre: string | null;
  clienteNif: string | null;
  delegacionId: string | null;
  delegacionNombre: string | null;
  estado: RechazoEstado;
  resultado: RechazoResultado | null;
  plataforma: PlataformaRechazo | null;
  nombre: string;
  motivo: string | null;
  documentacionNecesaria: string | null;
  diasRecordatorio: number;
  fechaRecordatorio: string | null;
  ultimoRecordatorio: string | null;
  fechaCreacion: string | null;
  fechaEstado: string | null;
  comentarios: RechazoComentario[];
  anexos: RechazoAnexoInfo[];
}

export interface RechazoPayload {
  nombre: string;
  estado?: string | null;
  resultado?: string | null;
  contratoId?: string | null;
  clienteId?: string | null;
  delegacionId?: string | null;
  motivo?: string | null;
  documentacionNecesaria?: string | null;
  diasRecordatorio?: number | null;
  fechaRecordatorio?: string | null;
}
