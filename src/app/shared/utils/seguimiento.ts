import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { StatusTone } from '../components/status-badge/status-badge';

/** Mismos valores que FiltroSeguimiento del backend. */
export type FiltroSeguimiento = 'revision' | 'escalados';

export const SEGUIMIENTO_OPCIONES: { value: FiltroSeguimiento; label: string }[] = [
  { value: 'revision',  label: 'Pendientes de revisión' },
  { value: 'escalados', label: 'Escalados' },
];

/** Parámetros de la URL y de la API (mismos nombres en SeguimientoScheduler). */
const PARAM_SEGUIMIENTO = 'seguimiento';
const PARAM_RESPONSABLE = 'responsableId';

/** El responsable filtrado está entre los usuarios cargados. */
export function responsableEnLista(usuarios: { id: string }[], id: string): boolean {
  return usuarios.some(u => u.id === id);
}

/** Responsable que pone el aviso en la URL, o '' si no viene. */
export function responsableDeUrl(qp: ParamMap): string {
  return qp.get(PARAM_RESPONSABLE) ?? '';
}

/** Filtro de seguimiento de la URL, o null. */
export function seguimientoDeUrl(qp: ParamMap): FiltroSeguimiento | null {
  const v = qp.get(PARAM_SEGUIMIENTO);
  return SEGUIMIENTO_OPCIONES.find(o => o.value === v)?.value ?? null;
}

/** Quita los parámetros tras aplicarlos: el aviso vuelve a funcionar y F5 no lo fuerza. */
export function quitarParamsAviso(router: Router, route: ActivatedRoute): void {
  router.navigate([], {
    relativeTo: route, queryParams: { [PARAM_SEGUIMIENTO]: null, [PARAM_RESPONSABLE]: null }, queryParamsHandling: 'merge', replaceUrl: true,
  });
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
