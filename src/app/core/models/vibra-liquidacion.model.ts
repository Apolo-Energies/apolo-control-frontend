export interface VibraLiquidacion {
  id: string;
  fecha: string | null;
  titular: string | null;
  nifCif: string | null;
  email: string | null;
  telefono: string | null;
  colaborador: string | null;
  producto: string | null;
  consumo: number | null;
  liquidado: string | null;               // Energaze
  liquidacionColaborador: string | null;  // Pagado / No pagado
}

export interface VibraLiquidacionFilter {
  q?: string;
  colaborador?: string;
  liquidacionColaborador?: string;
}

// ── Liquidación mensual por colaborador ──

export type TipoLineaLiquidacionVibra = 'ALTA' | 'BAJA' | 'ANIVERSARIO';
export type EstadoLiquidacionMensual = 'BORRADOR' | 'GUARDADA' | 'PAGADA';

export interface VibraLiquidacionLinea {
  altaId: string;
  tipo: TipoLineaLiquidacionVibra;
  aniversario: number;
  titular: string | null;
  cups: string | null;
  fechaActivacion: string | null;
  fechaBaja: string | null;
  diasActivo: number | null;
  comisionAplicada: number;
  importe: number;
  /** Fechas incoherentes: va a 0 € y bloquea guardar. */
  revisar: boolean;
}

export interface VibraLiquidacionMensual {
  id: string | null;
  clave: string;
  colaborador: string;
  /** AAAA-MM */
  mes: string;
  estado: EstadoLiquidacionMensual;
  comisionAlta: number | null;
  importeRenovacion: number;
  totalAltas: number;
  totalBajas: number;
  totalAniversarios: number;
  totalNeto: number;
  fechaPago: string | null;
  hayCambios: boolean;
  lineasARevisar: number;
  lineas: VibraLiquidacionLinea[];
}
