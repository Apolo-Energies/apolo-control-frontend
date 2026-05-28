import { Pipe, PipeTransform } from '@angular/core';
import { EnergyUnit, formatEnergy } from '../utils/format';

/**
 * Formatea un valor en MWh (la unidad base de la app) y lo escala a MWh / GWh.
 *
 * Modes:
 *   'full' (default): "76,99 GWh"     (valor + unidad)
 *   'value':          "76,99"          (sin unidad)
 *   'unit':           "GWh"            (solo unidad)
 *
 * forceUnit: opcional, fuerza una unidad concreta ('MWh' | 'GWh').
 *            Si no se pasa, escala a GWh cuando es >= 1.000 MWh.
 *
 * Reglas:
 *   - GWh: 2 decimales fijos (ej. "76,99 GWh")
 *   - MWh: preserva los decimales del backend
 *
 * Uso:
 *   {{ mwh | apoloEnergy }}                      → "76,99 GWh" (auto)
 *   {{ mwh | apoloEnergy:'value':'GWh' }}        → "76,99"
 *   {{ mwh | apoloEnergy:'unit':'GWh' }}         → "GWh"
 */
@Pipe({ name: 'apoloEnergy' })
export class ApoloEnergyPipe implements PipeTransform {
  transform(
    value: number | null | undefined,
    mode: 'full' | 'value' | 'unit' = 'full',
    forceUnit?: EnergyUnit,
  ): string {
    const energy = formatEnergy(value, forceUnit);
    switch (mode) {
      case 'value': return energy.value;
      case 'unit':  return energy.unit;
      default:      return `${energy.value} ${energy.unit}`;
    }
  }
}
