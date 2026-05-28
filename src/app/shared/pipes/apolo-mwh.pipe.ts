import { Pipe, PipeTransform } from '@angular/core';
import { formatMwh } from '../utils/format';

/**
 * Formatea un valor en MWh con punto de miles, coma decimal y sufijo " MWh".
 * Respeta todos los decimales del backend.
 * Uso: {{ consumo | apoloMwh }}
 * Ej:  76993.930248 → "76.993,930248 MWh"
 */
@Pipe({ name: 'apoloMwh' })
export class ApoloMwhPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return formatMwh(value);
  }
}
