import { ParamMap } from '@angular/router';
import { StatusTone } from '../components/status-badge/status-badge';

/** Enlace de los avisos de escalado: ?seguimiento=escalados (mismo valor en SeguimientoScheduler). */
export function pideEscalados(qp: ParamMap): boolean {
  return qp.get('seguimiento') === 'escalados';
}

/** "5 h" · "2 d 3 h" (1 d = 24 h laborables). */
export function formatAntiguedad(horas: number | null | undefined): string {
  if (horas == null) return '—';
  const d = Math.floor(horas / 24);
  const h = horas % 24;
  return d > 0 ? `${d} d ${h} h` : `${h} h`;
}

/** Color según el estado de seguimiento que calcula el backend. */
export function seguimientoTone(
  caso: { escaladoAt: string | null; revisionAvisadaAt: string | null },
  cerrado: boolean,
): StatusTone {
  if (cerrado) return 'neutral';
  if (caso.escaladoAt) return 'danger';
  if (caso.revisionAvisadaAt) return 'warning';
  return 'success';
}
