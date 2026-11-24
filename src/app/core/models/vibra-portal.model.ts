import { DatosFiscalesColaborador } from './vibra-colaborador.model';

/** Portal del colaborador Vibra (/api/vibra/portal). */
export interface PortalPerfil extends DatosFiscalesColaborador {
  nombre: string;
  email: string;
  comisionAlta: number | null;
  datosFiscalesCompletos: boolean;
}

export interface PortalContrato {
  id: string;
  numeroContrato: string | null;
  titular: string | null;
  nifCif: string | null;
  cups: string | null;
  direccionSuministro: string | null;
  poblacion: string | null;
  provincia: string | null;
  telefono: string | null;
  email: string | null;
  /** Enmascarado (ES91 **** 1332). */
  cuentaBancaria: string | null;
  comercializadora: string | null;
  estado: string | null;
  fecha: string | null;
  fechaFirma: string | null;
  fechaActivacionContrato: string | null;
  fechaBaja: string | null;
  potenciaP1: number | null;
  potenciaP2: number | null;
  potenciaP3: number | null;
  potenciaP4: number | null;
  potenciaP5: number | null;
  potenciaP6: number | null;
  tarifaId: string | null;
  tarifaNombre: string | null;
}

export interface PortalContratoRequest {
  titular: string;
  nifCif: string;
  telefono: string | null;
  email: string | null;
  cups: string;
  direccionSuministro: string;
  poblacion: string | null;
  provincia: string | null;
  potenciaP1: number | null;
  potenciaP2: number | null;
  potenciaP3: number | null;
  potenciaP4: number | null;
  potenciaP5: number | null;
  potenciaP6: number | null;
  comercializadora: string | null;
  cuentaBancaria: string;
  tarifaId: string | null;
}

export interface PortalProducto {
  id: string;
  nombre: string;
  tipo: string;
}

export interface PortalLiquidacion {
  id: string;
  /** YYYY-MM */
  mes: string;
  estado: 'GUARDADA' | 'PAGADA';
  fechaPago: string | null;
  lineas: number;
  totalAltas: number;
  totalBajas: number;
  totalAniversarios: number;
  totalNeto: number;
  autofacturaNumero: string | null;
  autofacturaFecha: string | null;
}
