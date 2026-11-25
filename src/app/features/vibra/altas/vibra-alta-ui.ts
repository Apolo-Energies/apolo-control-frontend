import { StatusTone } from '../../../shared/components/status-badge/status-badge';

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
