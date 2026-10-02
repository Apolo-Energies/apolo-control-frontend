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
