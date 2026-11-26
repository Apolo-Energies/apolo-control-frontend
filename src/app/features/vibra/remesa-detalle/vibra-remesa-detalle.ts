import { ChangeDetectionStrategy, Component, inject, input, signal, effect } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { ActionsMenu, ActionsMenuItem } from '../../../shared/components/actions-menu/actions-menu';
import { TableSkeleton } from '../../../shared/components/table-skeleton/table-skeleton';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { Icon } from '../../../shared/icons/icon';
import { RowLink } from '../../../shared/directives/row-link';
import { formatDate, formatDateTime, formatEuro } from '../../../shared/utils/format';
import { mensajeError } from '../../../shared/utils/http-error';

import { AuthService } from '../../../core/auth';
import { VibraRemesaService } from '../../../core/services/vibra-remesa.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  ESTADO_REMESA_VIBRA_LABEL, RESULTADO_RECIBO_VIBRA_LABEL, TIPO_REMESA_VIBRA_LABEL, VibraRemesa,
} from '../../../core/models';
import { descargarXml, estadoRemesaTone, fechaMadrid, resultadoReciboTone } from '../remesas/vibra-remesa-ui';
import { CellTail } from '../../../shared/components/cell-tail/cell-tail';

type Accion = 'anular' | 'cobrada';

/** Detalle de una remesa (como en Kilowy): cabecera, resumen por resultado y recibos. */
@Component({
  selector: 'app-vibra-remesa-detalle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeader, ActionsMenu, TableSkeleton, StatusBadge, ConfirmDialog, Icon, CellTail, RowLink],
  templateUrl: './vibra-remesa-detalle.html',
})
export class VibraRemesaDetalle {
  private readonly service = inject(VibraRemesaService);
  private readonly notify = inject(NotificationService);
  private readonly auth = inject(AuthService);

  /** Parámetro de ruta. */
  readonly id = input.required<string>();

  protected readonly tipoLabel = TIPO_REMESA_VIBRA_LABEL;
  protected readonly estadoLabel = ESTADO_REMESA_VIBRA_LABEL;
  protected readonly resultadoLabel = RESULTADO_RECIBO_VIBRA_LABEL;
  protected readonly estadoTone = estadoRemesaTone;
  protected readonly resultadoTone = resultadoReciboTone;
  protected readonly euro = formatEuro;
  protected readonly fecha = formatDate;
  protected readonly fechaHora = formatDateTime;
  protected readonly puedeGestionar = this.auth.hasRole('admin', 'contabilidad');
  protected readonly hoy = fechaMadrid();

  protected readonly remesa = signal<VibraRemesa | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly confirmar = signal<Accion | null>(null);
  protected readonly ocupado = signal(false);

  /** Cabecera: anular (poco frecuente, destructiva). */
  protected readonly masAcciones: ActionsMenuItem[] = [
    { label: 'Anular remesa', icon: 'circle-x', danger: true, action: () => this.confirmar.set('anular') },
  ];

  constructor() {
    effect(() => this.load(this.id()));
  }

  protected load(id = this.id()): void {
    this.error.set(null);
    this.service.get(id).subscribe({
      next: (r) => this.remesa.set(r),
      error: (err: HttpErrorResponse) => this.error.set(mensajeError(err, 'Error al cargar la remesa')),
    });
  }

  protected descargar(r: VibraRemesa): void {
    descargarXml(this.service, this.notify, r);
  }

  protected mensaje(a: Accion, r: VibraRemesa): string {
    return a === 'anular'
      ? `¿Anular la remesa nº ${r.numero}? Hazlo solo si no la has subido al banco o el banco la rechazó: sus facturas vuelven a pendientes de cobro.`
      : `¿Marcar cobrada la remesa nº ${r.numero}? Sus facturas pendientes de este cobro pasan a pagadas; las devueltas no cambian.`;
  }

  protected ejecutar(): void {
    const a = this.confirmar();
    const r = this.remesa();
    if (!a || !r) return;
    this.ocupado.set(true);
    (a === 'anular' ? this.service.anular(r.id) : this.service.cobrada(r.id)).subscribe({
      next: (out) => {
        this.ocupado.set(false);
        this.confirmar.set(null);
        this.remesa.set(out);
        this.notify.success(a === 'anular'
          ? `Remesa nº ${out.numero} anulada`
          : `Remesa nº ${out.numero} cobrada: ${out.cobrados} ${out.cobrados === 1 ? 'factura pagada' : 'facturas pagadas'}`);
      },
      error: (err: HttpErrorResponse) => {
        this.ocupado.set(false);
        this.notify.error(mensajeError(err, 'No se pudo completar la acción'));
      },
    });
  }
}
