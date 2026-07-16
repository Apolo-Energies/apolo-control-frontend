import {
  ChangeDetectionStrategy, Component, computed, inject, signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';

import { PageHeader }    from '../../../shared/components/page-header/page-header';
import { TableSkeleton } from '../../../shared/components/table-skeleton/table-skeleton';
import { StatusBadge, StatusTone } from '../../../shared/components/status-badge/status-badge';
import { KpiCard }       from '../../../shared/components/kpi-card/kpi-card';
import { EmptyState }    from '../../../shared/components/empty-state/empty-state';
import { Icon }          from '../../../shared/icons/icon';

import { GestionImpagoService } from '../../../core/services/gestion-impago.service';
import { NotificationService }  from '../../../core/services/notification.service';
import { GlobalLoadingService } from '../../../core/services/global-loading.service';
import {
  GestionImpago,
  EstadoGestionImpago, GestionImpagoActualizarEstadoPayload,
  ESTADO_GESTION_IMPAGO_LABEL, PRIORIDAD_GESTION_IMPAGO_LABEL,
} from '../../../core/models';

function extractMessage(err: HttpErrorResponse): string {
  return (err.error as { message?: string })?.message ?? err.message ?? 'Error inesperado';
}

@Component({
  selector: 'app-promises',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, TableSkeleton, StatusBadge, KpiCard, EmptyState, Icon, RouterLink],
  templateUrl: './promises.html',
})
export class Promises {
  private readonly service       = inject(GestionImpagoService);
  private readonly notify        = inject(NotificationService);
  private readonly globalLoading = inject(GlobalLoadingService);

  // ── List state ────────────────────────────────────────────────────────────
  protected readonly loading    = signal(false);
  protected readonly rows       = signal<GestionImpago[]>([]);
  protected readonly error      = signal<string | null>(null);
  protected updatingId          = signal<string | null>(null);

  // ── Today for overdue check ───────────────────────────────────────────────
  protected readonly today = new Date().toISOString().slice(0, 10);

  // ── Constants ─────────────────────────────────────────────────────────────
  protected readonly estadoLabel    = ESTADO_GESTION_IMPAGO_LABEL;
  protected readonly prioridadLabel = PRIORIDAD_GESTION_IMPAGO_LABEL;

  // ── Computed KPIs ─────────────────────────────────────────────────────────
  protected readonly vencidas     = computed(() =>
    this.rows().filter(r => r.promesaFecha && r.promesaFecha < this.today && !r.promesaCumplida).length,
  );
  protected readonly cumplidas    = computed(() => this.rows().filter(r => r.promesaCumplida).length);
  protected readonly totalImporte = computed(() =>
    this.rows().reduce((s, r) => s + (r.promesaImporte ?? r.importePendiente), 0),
  );

  constructor() { this.load(); }

  // ── Load ──────────────────────────────────────────────────────────────────
  protected load(): void {
    this.loading.set(true);
    this.service.promesas().subscribe({
      next:  (list) => { this.rows.set(list); this.loading.set(false); },
      error: (err: HttpErrorResponse) => { this.error.set(extractMessage(err)); this.loading.set(false); },
    });
  }

  // ── Mark fulfilled ────────────────────────────────────────────────────────
  protected marcarPagado(r: GestionImpago): void {
    this.updatingId.set(r.id);
    const payload: GestionImpagoActualizarEstadoPayload = { estado: 'pagado' };
    this.globalLoading.start('Actualizando', '');
    this.service.actualizarEstado(r.id, payload).subscribe({
      next: (updated) => {
        this.updatingId.set(null);
        this.globalLoading.stop();
        this.notify.success('Marcado como pagado');
        this.rows.update(list => list.map(item => item.id === updated.id ? updated : item));
      },
      error: (err: HttpErrorResponse) => {
        this.updatingId.set(null);
        this.globalLoading.stop();
        this.notify.error(extractMessage(err));
      },
    });
  }

  // ── Display helpers ───────────────────────────────────────────────────────
  protected isOverdue(r: GestionImpago): boolean {
    return !!r.promesaFecha && r.promesaFecha < this.today && !r.promesaCumplida;
  }

  protected estadoTone(estado: EstadoGestionImpago): StatusTone {
    switch (estado) {
      case 'pagado':       return 'success';
      case 'va_a_pagar':  return 'info';
      case 'acuerdo_pago':return 'info';
      case 'aviso_corte': return 'warning';
      case 'cortado':     return 'danger';
      case 'ovc':         return 'purple';
      case 'demanda':     return 'danger';
      default:            return 'neutral';
    }
  }

  protected formatEur(v: number): string {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v);
  }

  protected fmt(v: string | null): string {
    return v ? new Date(v).toLocaleDateString('es-ES') : '—';
  }
}
