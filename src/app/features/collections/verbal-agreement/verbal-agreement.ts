import {
  ChangeDetectionStrategy, Component, computed, inject, signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { PageHeader }   from '../../../shared/components/page-header/page-header';
import { TableSkeleton } from '../../../shared/components/table-skeleton/table-skeleton';
import { StatusBadge, StatusTone } from '../../../shared/components/status-badge/status-badge';
import { Pagination }   from '../../../shared/components/pagination/pagination';
import { Icon }         from '../../../shared/icons/icon';

import { GestionImpagoService } from '../../../core/services/gestion-impago.service';
import { NotificationService }  from '../../../core/services/notification.service';
import { GlobalLoadingService } from '../../../core/services/global-loading.service';
import {
  GestionImpago, GestionImpagoFilter,
  EstadoGestionImpago, GestionImpagoActualizarEstadoPayload,
  ESTADO_GESTION_IMPAGO_VALUES, ESTADO_GESTION_IMPAGO_LABEL,
  PRIORIDAD_GESTION_IMPAGO_LABEL, Page,
} from '../../../core/models';

function extractMessage(err: HttpErrorResponse): string {
  return (err.error as { message?: string })?.message ?? err.message ?? 'Error inesperado';
}

function estadoToneFn(estado: EstadoGestionImpago): StatusTone {
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

@Component({
  selector: 'app-verbal-agreement',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, TableSkeleton, StatusBadge, Pagination, Icon, FormsModule, RouterLink],
  templateUrl: './verbal-agreement.html',
})
export class VerbalAgreement {
  private readonly service       = inject(GestionImpagoService);
  private readonly notify        = inject(NotificationService);
  private readonly globalLoading = inject(GlobalLoadingService);

  // ── List state ────────────────────────────────────────────────────────────
  protected readonly loading       = signal(false);
  protected readonly result        = signal<Page<GestionImpago> | null>(null);
  protected readonly error         = signal<string | null>(null);
  protected readonly page          = signal(0);
  protected readonly size          = signal(20);

  // ── Filters ───────────────────────────────────────────────────────────────
  protected q = '';

  // ── Constants ─────────────────────────────────────────────────────────────
  protected readonly estadoValues   = ESTADO_GESTION_IMPAGO_VALUES;
  protected readonly estadoLabel    = ESTADO_GESTION_IMPAGO_LABEL;
  protected readonly prioridadLabel = PRIORIDAD_GESTION_IMPAGO_LABEL;

  protected readonly rows          = computed(() => this.result()?.content ?? []);
  protected readonly totalElements = computed(() => this.result()?.totalElements ?? 0);
  protected readonly totalPages    = computed(() => this.result()?.totalPages ?? 0);

  // ── Estado update ─────────────────────────────────────────────────────────
  protected updatingId = signal<string | null>(null);

  constructor() { this.reload(0); }

  // ── List ──────────────────────────────────────────────────────────────────
  protected reload(p: number): void {
    this.page.set(p);
    this.loading.set(true);
    const filter: GestionImpagoFilter = {
      q:      this.q || undefined,
      estado: 'va_a_pagar',
    };
    this.service.list(filter, { page: p, size: this.size() }).subscribe({
      next:  (res) => { this.result.set(res); this.loading.set(false); },
      error: (err: HttpErrorResponse) => { this.error.set(extractMessage(err)); this.loading.set(false); },
    });
  }

  protected onSizeChange(size: number): void { this.size.set(size); this.reload(0); }
  protected applyFilters(): void { this.reload(0); }
  protected clearFilters(): void { this.q = ''; this.reload(0); }

  // ── Estado update ─────────────────────────────────────────────────────────
  protected actualizarEstado(r: GestionImpago, estado: EstadoGestionImpago): void {
    this.updatingId.set(r.id);
    const payload: GestionImpagoActualizarEstadoPayload = { estado };
    this.globalLoading.start('Actualizando', '');
    this.service.actualizarEstado(r.id, payload).subscribe({
      next: () => {
        this.updatingId.set(null);
        this.globalLoading.stop();
        this.notify.success('Estado actualizado');
        this.reload(this.page());
      },
      error: (err: HttpErrorResponse) => {
        this.updatingId.set(null);
        this.globalLoading.stop();
        this.notify.error(extractMessage(err));
      },
    });
  }

  // ── Display helpers ───────────────────────────────────────────────────────
  protected estadoTone(estado: EstadoGestionImpago): StatusTone { return estadoToneFn(estado); }
  protected formatEur(v: number): string {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v);
  }
  protected fmt(v: string | null): string {
    return v ? new Date(v).toLocaleDateString('es-ES') : '—';
  }
}
