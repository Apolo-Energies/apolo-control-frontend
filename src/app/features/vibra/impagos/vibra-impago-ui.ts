import { StatusTone } from '../../../shared/components/status-badge/status-badge';
import { ESTADO_VIBRA_IMPAGO_LABEL, EstadoVibraImpago } from '../../../core/models';

/** Tono del badge de estado de un impago. */
export function estadoImpagoTone(estado: EstadoVibraImpago | null): StatusTone {
  switch (estado) {
    case 'PAGADO': return 'success';
    case 'IMPAGADA': return 'warning';
    case 'PLAN_PAGOS': return 'info';
    case 'INCOBRABLE': case 'RECLAMACION': case 'BUROFAX': return 'danger';
    default: return 'neutral';
  }
}

/** Etiqueta corta para el badge de la tabla (la completa va en el menú y en el nombre accesible). */
export function estadoImpagoCorto(estado: EstadoVibraImpago): string {
  switch (estado) {
    case 'PLAN_PAGOS': return 'Plan de pagos';
    case 'RECLAMACION': return 'En reclamación';
    default: return ESTADO_VIBRA_IMPAGO_LABEL[estado];
  }
}

/** Tono del contrato del cliente (Activo/Baja) junto al impago. */
export function activoBajaTone(v: string | null): StatusTone {
  return v === 'Baja' ? 'danger' : 'success';
}
