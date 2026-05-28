import { Pipe, PipeTransform } from '@angular/core';
import { formatDecimal2, formatFullDecimal } from '../utils/format';

/**
 * Formatea un número con punto de miles y coma decimal.
 *  - 'fixed' (default): siempre 2 decimales
 *  - 'full': respeta todos los decimales del backend (mínimo 2)
 *
 * Uso:
 *   {{ valor | apoloDecimal }}          → "1.234,50"
 *   {{ consumo | apoloDecimal:'full' }} → "76.993,930248"
 */
@Pipe({ name: 'apoloDecimal' })
export class ApoloDecimalPipe implements PipeTransform {
  transform(value: number | null | undefined, mode: 'fixed' | 'full' = 'fixed'): string {
    if (mode === 'full') {
      return formatFullDecimal(value);
    }
    return formatDecimal2(value);
  }
}
