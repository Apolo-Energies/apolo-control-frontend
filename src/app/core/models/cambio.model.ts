export type TipoCambio =
  | 'cambio_potencia'
  | 'cambio_titularidad'
  | 'cambio_cuenta_bancaria'
  | 'cambio_oferta'
  | 'baja_por_cese'
  | 'otra';

export type ResultadoCambio =
  | 'activo'
  | 'rechazado'
  | 'en_tramite'
  | 'enviado_a_firma'
  | 'cerrada'
  | 'doc_firmada';

export const TIPO_CAMBIO_LABEL: Record<TipoCambio, string> = {
  cambio_potencia:        'Cambio de potencia',
  cambio_titularidad:     'Cambio de titularidad',
  cambio_cuenta_bancaria: 'Cambio de cuenta bancaria',
  cambio_oferta:          'Cambio de oferta',
  baja_por_cese:          'Baja por cese',
  otra:                   'Otra',
};

export const RESULTADO_CAMBIO_LABEL: Record<ResultadoCambio, string> = {
  activo:          'Activo',
  rechazado:       'Rechazado',
  en_tramite:      'En trámite',
  enviado_a_firma: 'Enviado a firma',
  cerrada:         'Cerrada',
  doc_firmada:     'Doc. firmada',
};

export const TIPO_CAMBIO_VALUES: TipoCambio[] = [
  'cambio_potencia',
  'cambio_titularidad',
  'cambio_cuenta_bancaria',
  'cambio_oferta',
  'baja_por_cese',
  'otra',
];

export const RESULTADO_CAMBIO_VALUES: ResultadoCambio[] = [
  'activo',
  'rechazado',
  'en_tramite',
  'enviado_a_firma',
  'cerrada',
  'doc_firmada',
];

export interface Cambio {
  id: string;
  clienteId: string | null;
  clienteNombre: string;
  clienteNif: string | null;
  cups: string | null;
  tipoSolicitud: TipoCambio;
  resultado: ResultadoCambio | null;
  gestionado: boolean;
  fechaSolicitud: string | null;
  fechaEnvioDocumentacion: string | null;
  fechaDocumentoFirma: string | null;
  fechaActivo: string | null;
  comentarios: string | null;
  idExterno: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CambioRequest {
  clienteId?: string | null;
  clienteNombre: string;
  cups?: string | null;
  tipoSolicitud: TipoCambio;
  resultado?: ResultadoCambio | null;
  gestionado?: boolean;
  fechaSolicitud?: string | null;
  fechaEnvioDocumentacion?: string | null;
  fechaDocumentoFirma?: string | null;
  fechaActivo?: string | null;
  comentarios?: string | null;
}
