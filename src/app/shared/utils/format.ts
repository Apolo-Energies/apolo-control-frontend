// Formato numérico estándar de la app (formato español):
//   - Separador de miles:  punto (.)
//   - Separador decimal:   coma (,)
//   Ej: 11.123.957,72
// Locale es-ES tanto para números como para fechas (DD/MM/YYYY).

const NUMBER_LOCALE = 'es-ES';

const EURO_FORMATTER = new Intl.NumberFormat(NUMBER_LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const NUMBER_FORMATTER = new Intl.NumberFormat(NUMBER_LOCALE, {
  maximumFractionDigits: 2,
});

const INTEGER_FORMATTER = new Intl.NumberFormat(NUMBER_LOCALE, {
  maximumFractionDigits: 0,
});

const TWO_DECIMALS_FORMATTER = new Intl.NumberFormat(NUMBER_LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Para magnitudes que pueden venir con muchos decimales del backend.
// Respeta TAL CUAL los decimales: 490 → "490", 21633673.869 → "21.633.673,869"
const FULL_PRECISION_FORMATTER = new Intl.NumberFormat(NUMBER_LOCALE, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 20,
});

const DATE_FORMATTER = new Intl.DateTimeFormat('es-ES', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const DATETIME_FORMATTER = new Intl.DateTimeFormat('es-ES', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const SHORT_MONTHS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

export function formatEuro(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return `${EURO_FORMATTER.format(value)} €`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return NUMBER_FORMATTER.format(value);
}

export function formatInteger(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return INTEGER_FORMATTER.format(value);
}

export function formatDecimal2(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return TWO_DECIMALS_FORMATTER.format(value);
}

export function formatFullDecimal(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return FULL_PRECISION_FORMATTER.format(value);
}

/**
 * Formatea un valor en MWh con sufijo " MWh", preservando todos los decimales.
 * Ej: 76993.930248 → "76.993,930248 MWh"
 */
export function formatMwh(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return `${FULL_PRECISION_FORMATTER.format(value)} MWh`;
}

export type EnergyUnit = 'MWh' | 'GWh';

/**
 * Escala un valor recibido en MWh y devuelve el número formateado:
 *  - MWh si el valor es < 1.000 MWh
 *  - GWh (dividiendo entre 1.000) si es >= 1.000 MWh
 *
 * `forceUnit` permite forzar la unidad (ej. siempre mostrar GWh en KPIs principales).
 */
export function formatEnergy(
  mwh: number | null | undefined,
  forceUnit?: EnergyUnit,
): { value: string; unit: EnergyUnit; rawMwh: number } {
  if (mwh === null || mwh === undefined || Number.isNaN(mwh)) {
    return { value: '—', unit: forceUnit ?? 'MWh', rawMwh: 0 };
  }
  const unit = forceUnit ?? (Math.abs(mwh) >= 1_000 ? 'GWh' : 'MWh');
  if (unit === 'GWh') {
    return { value: TWO_DECIMALS_FORMATTER.format(mwh / 1_000), unit, rawMwh: mwh };
  }
  return { value: FULL_PRECISION_FORMATTER.format(mwh), unit, rawMwh: mwh };
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) {
    return '—';
  }
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return DATE_FORMATTER.format(date);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) {
    return '—';
  }
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return DATETIME_FORMATTER.format(date);
}

export function formatMonthShort(yearMonth: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(yearMonth);
  if (!match) {
    return yearMonth;
  }
  const month = Number(match[2]);
  const yearShort = match[1].slice(2);
  if (month < 1 || month > 12) {
    return yearMonth;
  }
  return `${SHORT_MONTHS[month - 1]} ${yearShort}`;
}

export function safeText(value: string | null | undefined, fallback = '—'): string {
  return value && value.trim().length > 0 ? value : fallback;
}
