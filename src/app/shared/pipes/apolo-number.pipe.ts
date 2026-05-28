import { Pipe, PipeTransform } from '@angular/core';
import { formatNumber } from '../utils/format';

/**
 * Formatea un número con punto de miles y coma decimal (hasta 2 decimales).
 * Uso: {{ valor | apoloNumber }}
 * Ej:   1234.5 → "1.234,5"
 */
@Pipe({ name: 'apoloNumber' })
export class ApoloNumberPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return formatNumber(value);
  }
}
