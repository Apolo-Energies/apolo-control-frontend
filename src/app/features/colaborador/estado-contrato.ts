import { StatusTone } from '../../shared/components/status-badge/status-badge';
import { ESTADO_VIBRA_ALTA_LABEL, EstadoVibraAlta } from '../../core/models';

/** Etiqueta y color del estado de un contrato Vibra en el portal. */
export function estadoLabel(estado: string | null): string {
  return estado ? (ESTADO_VIBRA_ALTA_LABEL[estado as EstadoVibraAlta] ?? estado) : '—';
}

export function estadoTone(estado: string | null): StatusTone {
  switch (estado) {
    case 'ACTIVO': return 'success';
    case 'PENDIENTE_FIRMA': return 'warning';
    case 'FIRMADO':
    case 'TRAMITADO': return 'info';
    case 'BAJA':
    case 'CANCELADO': return 'danger';
    default: return 'neutral';
  }
}
