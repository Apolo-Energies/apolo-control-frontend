export type TipoTarifaVibra = '2.0TD' | '3.0TD';

export const TIPO_TARIFA_VIBRA_VALUES: TipoTarifaVibra[] = ['2.0TD', '3.0TD'];

export interface VibraTarifa {
  id: string;
  idExterno: string;
  nombre: string;
  tipo: string;
  activa: boolean;

  p1Energia: number | null;
  p2Energia: number | null;
  p3Energia: number | null;
  p4Energia: number | null;
  p5Energia: number | null;
  p6Energia: number | null;

  p1Potencia: number | null;
  p2Potencia: number | null;
  p3Potencia: number | null;
  p4Potencia: number | null;
  p5Potencia: number | null;
  p6Potencia: number | null;

  createdAt: string;
  updatedAt: string;
}

export interface VibraTarifaPayload {
  nombre: string;
  tipo: string;
  activa?: boolean;
  p1Energia?: number | null;
  p2Energia?: number | null;
  p3Energia?: number | null;
  p4Energia?: number | null;
  p5Energia?: number | null;
  p6Energia?: number | null;
  p1Potencia?: number | null;
  p2Potencia?: number | null;
  p3Potencia?: number | null;
  p4Potencia?: number | null;
  p5Potencia?: number | null;
  p6Potencia?: number | null;
}

export interface VibraTarifaFilter {
  tipo?: string;
  activa?: boolean;
}

// ── Carga de precios desde la plantilla Excel ────────────────────

export type AccionCargaTarifa = 'CREAR' | 'ACTUALIZAR' | 'NUEVA_VERSION' | 'SIN_CAMBIOS' | 'ERROR';

export const ACCION_CARGA_TARIFA_LABEL: Record<AccionCargaTarifa, string> = {
  CREAR: 'Crear',
  ACTUALIZAR: 'Actualizar',
  NUEVA_VERSION: 'Versión nueva',
  SIN_CAMBIOS: 'Sin cambios',
  ERROR: 'Error',
};

export interface FilaCargaTarifa {
  fila: number;
  nombre: string | null;
  tipo: string | null;
  activa: boolean | null;
  energia: (number | null)[];
  potencia: (number | null)[];
  accion: AccionCargaTarifa;
  motivo: string | null;
  productoId: string | null;
  /** Nombre con el que queda (el de la versión nueva si se versiona). */
  nombreResultado: string | null;
}

export interface CargaTarifasResponse {
  aplicado: boolean;
  crear: number;
  actualizar: number;
  nuevaVersion: number;
  sinCambios: number;
  errores: number;
  filas: FilaCargaTarifa[];
}
