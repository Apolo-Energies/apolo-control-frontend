import {
  ChangeDetectionStrategy, Component, computed, inject, signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { PageHeader }    from '../../../shared/components/page-header/page-header';
import { TableSkeleton } from '../../../shared/components/table-skeleton/table-skeleton';
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
  imports: [PageHeader, TableSkeleton, EmptyState, Icon, FormsModule, RouterLink],
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

  // ── Search ────────────────────────────────────────────────────────────────
  protected q = '';

  // ── Today ─────────────────────────────────────────────────────────────────
  protected readonly today = new Date().toISOString().slice(0, 10);

  // ── Constants ─────────────────────────────────────────────────────────────
  protected readonly estadoLabel    = ESTADO_GESTION_IMPAGO_LABEL;
  protected readonly prioridadLabel = PRIORIDAD_GESTION_IMPAGO_LABEL;

  // ── Filtered rows ─────────────────────────────────────────────────────────
  protected readonly filtered = computed(() => {
    const q = this.q.toLowerCase().trim();
    if (!q) return this.rows();
    return this.rows().filter(r =>
      (r.clienteNombre ?? '').toLowerCase().includes(q) ||
      (r.numeroFactura ?? '').toLowerCase().includes(q),
    );
  });

  // ── Computed groups ───────────────────────────────────────────────────────
  protected readonly rowsVencidas  = computed(() =>
    this.filtered().filter(r => r.promesaFecha && r.promesaFecha < this.today),
  );
  protected readonly rowsHoy       = computed(() =>
    this.filtered().filter(r => r.promesaFecha === this.today),
  );
  protected readonly rowsProximas  = computed(() =>
    this.filtered().filter(r => r.promesaFecha && r.promesaFecha > this.today),
  );

  // ── KPIs ──────────────────────────────────────────────────────────────────
  protected readonly totalActivas  = computed(() => this.filtered().length);
  protected readonly countVencidas = computed(() => this.rowsVencidas().length);
  protected readonly countHoy      = computed(() => this.rowsHoy().length);
  protected readonly countProximas = computed(() => this.rowsProximas().length);

  constructor() { this.load(); }

  // ── Load ──────────────────────────────────────────────────────────────────
  protected load(): void {
    this.loading.set(true);
    this.service.promesas().subscribe({
      next:  (list) => { this.rows.set(list); this.loading.set(false); },
      error: (err: HttpErrorResponse) => { this.error.set(extractMessage(err)); this.loading.set(false); },
    });
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  protected marcarPagado(r: GestionImpago): void {
    this.updatingId.set(r.id);
    this.globalLoading.start('Actualizando', '');
    this.service.actualizarEstado(r.id, { estado: 'pagado' }).subscribe({
      next: () => {
        this.updatingId.set(null);
        this.globalLoading.stop();
        this.notify.success('Marcado como pagado');
        this.rows.update(list => list.filter(item => item.id !== r.id));
      },
      error: (err: HttpErrorResponse) => {
        this.updatingId.set(null);
        this.globalLoading.stop();
        this.notify.error(extractMessage(err));
      },
    });
  }

  protected marcarNoPago(r: GestionImpago): void {
    this.updatingId.set(r.id);
    this.globalLoading.start('Actualizando', '');
    this.service.marcarNoPago(r.id).subscribe({
      next: () => {
        this.updatingId.set(null);
        this.globalLoading.stop();
        this.notify.success('Promesa borrada — pendiente de reagendar');
        this.rows.update(list => list.filter(item => item.id !== r.id));
      },
      error: (err: HttpErrorResponse) => {
        this.updatingId.set(null);
        this.globalLoading.stop();
        this.notify.error(extractMessage(err));
      },
    });
  }

  // ── Display helpers ───────────────────────────────────────────────────────
  protected daysLeft(fechaStr: string | null): number {
    if (!fechaStr) return 0;
    const diff = new Date(fechaStr).getTime() - new Date(this.today).getTime();
    return Math.round(diff / 86_400_000);
  }

  protected lastPromesaNote(r: GestionImpago): string | null {
    if (!r.contactoHistory?.length) return null;
    const entries = r.contactoHistory.filter(h => h.actionKey === 'promesa');
    return entries.at(-1)?.notes ?? null;
  }

  protected formatEur(v: number | null | undefined): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency', currency: 'EUR', minimumFractionDigits: 0,
    }).format(v ?? 0);
  }

  protected fmt(v: string | null): string {
    return v ? new Date(v).toLocaleDateString('es-ES') : '—';
  }
}
