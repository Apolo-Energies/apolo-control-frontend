import {
  ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { PageHeader }    from '../../../shared/components/page-header/page-header';
import { TableSkeleton } from '../../../shared/components/table-skeleton/table-skeleton';
import { KpiCard }       from '../../../shared/components/kpi-card/kpi-card';
import { EmptyState }    from '../../../shared/components/empty-state/empty-state';
import { Icon }          from '../../../shared/icons/icon';

import { GestionImpagoService } from '../../../core/services/gestion-impago.service';
import { NotificationService }  from '../../../core/services/notification.service';
import { GlobalLoadingService } from '../../../core/services/global-loading.service';
import { ListStateService }     from '../../../core/services/list-state.service';
import {
  GestionImpago, GestionImpagoPayload,
  EstadoGestionImpago, GestionImpagoActualizarEstadoPayload,
  ESTADO_GESTION_IMPAGO_LABEL,
} from '../../../core/models';

function extractMessage(err: HttpErrorResponse): string {
  return (err.error as { message?: string })?.message ?? err.message ?? 'Error inesperado';
}

@Component({
  selector: 'app-formal-agreement',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, TableSkeleton, KpiCard, EmptyState, Icon, FormsModule, RouterLink],
  templateUrl: './formal-agreement.html',
})
export class FormalAgreement implements OnDestroy {
  private readonly service       = inject(GestionImpagoService);
  private readonly notify        = inject(NotificationService);
  private readonly globalLoading = inject(GlobalLoadingService);
  private readonly listState     = inject(ListStateService);

  // ── List state ────────────────────────────────────────────────────────────
  protected readonly loading    = signal(false);
  protected readonly rows       = signal<GestionImpago[]>([]);
  protected readonly error      = signal<string | null>(null);
  protected updatingId          = signal<string | null>(null);
  protected enviandoId          = signal<string | null>(null);

  // ── Search ────────────────────────────────────────────────────────────────
  protected readonly q = signal('');

  // ── Constants ─────────────────────────────────────────────────────────────
  protected readonly estadoLabel = ESTADO_GESTION_IMPAGO_LABEL;

  // ── Filtered ──────────────────────────────────────────────────────────────
  protected readonly filtered = computed(() => {
    const q = this.q().toLowerCase().trim();
    if (!q) return this.rows();
    return this.rows().filter(r =>
      (r.clienteNombre ?? '').toLowerCase().includes(q) ||
      (r.numeroFactura ?? '').toLowerCase().includes(q),
    );
  });

  // ── KPIs ──────────────────────────────────────────────────────────────────
  protected readonly pendientesEnvio = computed(() =>
    this.rows().filter(r => !r.ovcEnviado),
  );
  protected readonly enviados = computed(() =>
    this.rows().filter(r => r.ovcEnviado),
  );
  protected readonly totalDeuda = computed(() =>
    this.rows().reduce((s, r) => s + r.importePendiente, 0),
  );

  constructor() {
    const s = this.listState.get<{ q: string }>('formal-agreement');
    if (s) this.q.set(s.q);
    this.load();
  }

  ngOnDestroy(): void {
    this.listState.save('formal-agreement', { q: this.q() });
  }

  // ── Load ──────────────────────────────────────────────────────────────────
  protected load(): void {
    this.loading.set(true);
    this.service.ovc().subscribe({
      next:  (list) => { this.rows.set(list); this.loading.set(false); },
      error: (err: HttpErrorResponse) => { this.error.set(extractMessage(err)); this.loading.set(false); },
    });
  }

  // ── Estado update ─────────────────────────────────────────────────────────
  protected actualizarEstado(r: GestionImpago, estado: EstadoGestionImpago): void {
    this.updatingId.set(r.id);
    this.globalLoading.start('Actualizando', '');
    this.service.actualizarEstado(r.id, { estado }).subscribe({
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

  // ── Patch boolean fields ──────────────────────────────────────────────────
  protected patchRecord(r: GestionImpago, patch: Partial<GestionImpagoPayload>): void {
    this.updatingId.set(r.id);
    const payload: GestionImpagoPayload = {
      clienteId:        r.clienteId,
      importe:          r.importe,
      parcialPagado:    r.parcialPagado,
      moneda:           r.moneda,
      estado:           r.estado,
      ovcPredemanda:    r.ovcPredemanda,
      demandaM1:        r.demandaM1,
      motivoDevolucion: r.motivoDevolucion,
      ...patch,
    };
    this.service.update(r.id, payload).subscribe({
      next: (updated) => {
        this.updatingId.set(null);
        this.rows.update(list => list.map(item => item.id === updated.id ? updated : item));
      },
      error: (err: HttpErrorResponse) => {
        this.updatingId.set(null);
        this.notify.error(extractMessage(err));
      },
    });
  }

  // ── Marcar enviado ────────────────────────────────────────────────────────
  protected marcarEnviado(r: GestionImpago): void {
    this.enviandoId.set(r.id);
    this.service.marcarOvcEnviado(r.id).subscribe({
      next: (updated) => {
        this.enviandoId.set(null);
        this.rows.update(list => list.map(item => item.id === updated.id ? updated : item));
        this.notify.success('OVC marcado como enviado');
      },
      error: (err: HttpErrorResponse) => {
        this.enviandoId.set(null);
        this.notify.error(extractMessage(err));
      },
    });
  }

  // ── Export CSV ────────────────────────────────────────────────────────────
  protected exportCsv(): void {
    const headers = ['Cliente', 'NIF', 'Factura', 'Importe', 'Pendiente', 'Inicio OVC', 'Estado', 'Predemanda', 'Demanda M+1'];
    const rows = this.rows().map(r => [
      r.clienteNombre ?? r.clienteId,
      r.clienteNif ?? '',
      r.numeroFactura ?? '',
      r.importe,
      r.importePendiente,
      r.ovcStartDate ?? '',
      this.estadoLabel[r.estado] ?? r.estado,
      r.ovcPredemanda ? 'Sí' : 'No',
      r.demandaM1 ? 'Sí' : 'No',
    ]);
    const csv = [headers, ...rows].map(row =>
      row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','),
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'ovc.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  // ── Display helpers ───────────────────────────────────────────────────────
  protected formatEur(v: number): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency', currency: 'EUR', minimumFractionDigits: 0,
    }).format(v);
  }

  protected fmt(v: string | null): string {
    return v ? new Date(v).toLocaleDateString('es-ES') : '—';
  }
}
