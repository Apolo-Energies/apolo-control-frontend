import { Pipe, PipeTransform } from '@angular/core';
import { formatEuro } from '../utils/format';

/**
 * Formatea un número como moneda EUR con punto de miles, coma decimal y "€" al final.
 * Siempre 2 decimales fijos.
 * Uso: {{ margen | apoloEuro }}
 * Ej:  11123957.7193 → "11.123.957,72 €"
 */
@Pipe({ name: 'apoloEuro' })
export class ApoloEuroPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return formatEuro(value);
  }
}
