/** Colaborador Vibra (nombre que vuelca Kilowy) con su comisión por alta. */
export interface VibraColaborador extends DatosFiscalesColaborador {
  clave: string;
  nombre: string;
  comisionAlta: number | null;
  contratosActivos: number;
  sinComision: boolean;
  /** Email de su usuario del portal; null = sin acceso. */
  accesoEmail: string | null;
  accesoActivo: boolean;
  datosFiscalesCompletos: boolean;
}

export type TipoFiscalVibra = 'AUTONOMO' | 'SOCIEDAD';

export const TIPO_FISCAL_VIBRA_LABEL: Record<TipoFiscalVibra, string> = {
  AUTONOMO: 'Autónomo',
  SOCIEDAD: 'Sociedad',
};

/** Datos de la autofactura del colaborador (como «Datos fiscales de su autofactura» de Kilowy). */
export interface DatosFiscalesColaborador {
  tipoFiscal: TipoFiscalVibra | null;
  nombreFiscal: string | null;
  nifFiscal: string | null;
  direccionFiscal: string | null;
  iban: string | null;
  /** null en colaboradores aún no guardados en Control: 21 / 0 por defecto. */
  ivaPct: number | null;
  irpfPct: number | null;
}

/** Contraseña inicial / nueva: ≥ 10 caracteres con letras y números (igual que el backend). */
export const PASSWORD_PATTERN = '(?=.*[A-Za-z])(?=.*\\d).{10,}';

export interface VibraComisionHistorial {
  anterior: number | null;
  nuevo: number;
  usuario: string | null;
  fecha: string;
}
