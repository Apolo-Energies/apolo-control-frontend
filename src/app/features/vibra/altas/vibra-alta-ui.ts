import { StatusTone } from '../../../shared/components/status-badge/status-badge';
import { ESTADO_VIBRA_ALTA_LABEL, EstadoVibraAlta } from '../../../core/models';

/** Etiqueta del estado de un alta (también en el portal del colaborador). */
export function estadoAltaLabel(estado: string | null): string {
  return estado ? (ESTADO_VIBRA_ALTA_LABEL[estado as EstadoVibraAlta] ?? estado) : '—';
}

/** Tono del badge de estado de un alta. */
export function estadoAltaTone(estado: string | null): StatusTone {
  switch (estado) {
    case 'ACTIVO': return 'success';
    case 'BAJA': case 'CANCELADO': return 'danger';
    case 'FIRMADO': case 'TRAMITADO': return 'info';
    case 'PENDIENTE_FIRMA': return 'warning';
    default: return 'neutral';
  }
}
