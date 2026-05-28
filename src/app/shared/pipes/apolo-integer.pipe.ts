import { Pipe, PipeTransform } from '@angular/core';
import { formatInteger } from '../utils/format';

/**
 * Formatea un número como entero con punto de miles (sin decimales).
 * Uso: {{ totalContratos | apoloInteger }}
 * Ej:  1519 → "1.519"
 */
@Pipe({ name: 'apoloInteger' })
export class ApoloIntegerPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return formatInteger(value);
  }
}
