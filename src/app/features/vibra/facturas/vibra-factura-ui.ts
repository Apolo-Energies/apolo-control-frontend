import { StatusTone } from '../../../shared/components/status-badge/status-badge';
import { EstadoFacturaVibra } from '../../../core/models';

export function estadoFacturaTone(estado: EstadoFacturaVibra): StatusTone {
  switch (estado) {
    case 'PAGADA': return 'success';
    case 'EMITIDA': return 'info';
    case 'IMPAGADA': case 'DEVUELTA': return 'danger';
    default: return 'neutral';
  }
}

/** Descarga un blob con ese nombre. */
export function descargarBlob(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

/** Abre un PDF (blob) en otra pestaña. */
export function abrirBlob(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
