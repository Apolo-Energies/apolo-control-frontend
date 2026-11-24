import { HttpErrorResponse } from '@angular/common/http';

import { StatusTone } from '../../../shared/components/status-badge/status-badge';
import { mensajeErrorBlob } from '../../../shared/utils/http-error';
import { EstadoRemesaVibra, ResultadoReciboVibra, VibraRemesaListItem } from '../../../core/models';
import { VibraRemesaService } from '../../../core/services/vibra-remesa.service';
import { NotificationService } from '../../../core/services/notification.service';
import { descargarBlob } from '../facturas/vibra-factura-ui';

export function estadoRemesaTone(estado: EstadoRemesaVibra): StatusTone {
  switch (estado) {
    case 'COBRADA': return 'success';
    case 'GENERADA': return 'info';
    default: return 'neutral';
  }
}

export function resultadoReciboTone(r: ResultadoReciboVibra): StatusTone {
  switch (r) {
    case 'COBRADO': return 'success';
    case 'DEVUELTO': return 'danger';
    case 'EN_BANCO': return 'info';
    default: return 'neutral';
  }
}

/** Fecha ISO (yyyy-MM-dd) de hoy + dias en hora de España. */
export function fechaMadrid(dias = 0): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date(Date.now() + dias * 86_400_000));
}

/** Descarga el XML guardado como remesa-{n}-{fecha}.xml (el mismo nombre que da el backend). */
export function descargarXml(service: VibraRemesaService, notify: NotificationService, r: VibraRemesaListItem): void {
  service.xml(r.id).subscribe({
    next: (blob) => descargarBlob(blob, `remesa-${r.numero}-${r.fechaCobro}.xml`),
    error: async (err: HttpErrorResponse) => notify.error(await mensajeErrorBlob(err, 'Error al descargar el XML')),
  });
}
