import {
  ChangeDetectionStrategy, Component, computed, inject, signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';

import { PageHeader }    from '../../../shared/components/page-header/page-header';
import { TableSkeleton } from '../../../shared/components/table-skeleton/table-skeleton';
import { KpiCard }       from '../../../shared/components/kpi-card/kpi-card';
import { EmptyState }    from '../../../shared/components/empty-state/empty-state';
import { StatusTone }   from '../../../shared/components/status-badge/status-badge';
import { Icon }          from '../../../shared/icons/icon';

import { GestionImpagoService } from '../../../core/services/gestion-impago.service';
import { NotificationService }  from '../../../core/services/notification.service';
import { GlobalLoadingService } from '../../../core/services/global-loading.service';
import {
  GestionImpago,
  EstadoGestionImpago, GestionImpagoActualizarEstadoPayload,
  ESTADO_GESTION_IMPAGO_LABEL,
} from '../../../core/models';

function extractMessage(err: HttpErrorResponse): string {
  return (err.error as { message?: string })?.message ?? err.message ?? 'Error inesperado';
}

@Component({
  selector: 'app-lawsuits',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, TableSkeleton, KpiCard, EmptyState, Icon, RouterLink],
  templateUrl: './lawsuits.html',
})
export class Lawsuits {
  private readonly service       = inject(GestionImpagoService);
  private readonly notify        = inject(NotificationService);
  private readonly globalLoading = inject(GlobalLoadingService);

  // ── List state ────────────────────────────────────────────────────────────
  protected readonly loading    = signal(false);
  protected readonly rows       = signal<GestionImpago[]>([]);
  protected readonly error      = signal<string | null>(null);
  protected updatingId          = signal<string | null>(null);

  // ── Constants ─────────────────────────────────────────────────────────────
  protected readonly estadoLabel = ESTADO_GESTION_IMPAGO_LABEL;

  // ── Computed KPIs ─────────────────────────────────────────────────────────
  protected readonly preparadas  = computed(() => this.rows().filter(r => r.demandaPreparada).length);
  protected readonly enviadas    = computed(() => this.rows().filter(r => r.demandaEnviada).length);
  protected readonly judiciales  = computed(() => this.rows().filter(r => r.procesoJudicialGestionado).length);
  protected readonly totalDeuda  = computed(() => this.rows().reduce((s, r) => s + r.importePendiente, 0));

  constructor() { this.load(); }

  // ── Load ──────────────────────────────────────────────────────────────────
  protected load(): void {
    this.loading.set(true);
    this.service.demanda().subscribe({
      next:  (list) => { this.rows.set(list); this.loading.set(false); },
      error: (err: HttpErrorResponse) => { this.error.set(extractMessage(err)); this.loading.set(false); },
    });
  }

  // ── Estado update ─────────────────────────────────────────────────────────
  protected actualizarEstado(r: GestionImpago, estado: EstadoGestionImpago): void {
    this.updatingId.set(r.id);
    const payload: GestionImpagoActualizarEstadoPayload = { estado };
    this.globalLoading.start('Actualizando', '');
    this.service.actualizarEstado(r.id, payload).subscribe({
      next: (updated) => {
        this.updatingId.set(null);
        this.globalLoading.stop();
        this.notify.success('Estado actualizado');
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
  protected estadoTone(estado: EstadoGestionImpago): StatusTone {
    switch (estado) {
      case 'demanda': return 'danger';
      case 'pagado':  return 'success';
      default:        return 'neutral';
    }
  }

  protected formatEur(v: number): string {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v);
  }

  protected fmt(v: string | null): string {
    return v ? new Date(v).toLocaleDateString('es-ES') : '—';
  }

  protected bool(v: boolean): string { return v ? '✓' : '—'; }
}
