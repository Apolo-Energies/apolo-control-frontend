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
  GestionImpago, EstadoGestionImpago, DemandaDocumento,
  GestionImpagoActualizarEstadoPayload, ESTADO_GESTION_IMPAGO_LABEL,
} from '../../../core/models';

function extractMessage(err: HttpErrorResponse): string {
  return (err.error as { message?: string })?.message ?? err.message ?? 'Error inesperado';
}

interface DemandaForm {
  fechaEnvioDemanda: string;
  cantidadDemandada: string;
  abogadoResponsable: string;
}

@Component({
  selector: 'app-lawsuits',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, TableSkeleton, KpiCard, EmptyState, Icon, FormsModule, RouterLink],
  templateUrl: './lawsuits.html',
})
export class Lawsuits implements OnDestroy {
  private readonly service       = inject(GestionImpagoService);
  private readonly notify        = inject(NotificationService);
  private readonly globalLoading = inject(GlobalLoadingService);
  private readonly listState     = inject(ListStateService);

  // ── List state ────────────────────────────────────────────────────────────
  protected readonly loading    = signal(false);
  protected readonly rows       = signal<GestionImpago[]>([]);
  protected readonly error      = signal<string | null>(null);
  protected readonly updatingId = signal<string | null>(null);
  protected readonly uploadingId = signal<string | null>(null);

  // ── Expand / edit state ───────────────────────────────────────────────────
  protected readonly expandedId = signal<string | null>(null);
  protected demandaForms: Record<string, DemandaForm> = {};

  // ── Search & filter ───────────────────────────────────────────────────────
  protected readonly q            = signal('');
  protected readonly estadoFilter = signal<string>('all');

  protected readonly filtered = computed(() => {
    const q  = this.q().toLowerCase().trim();
    const ef = this.estadoFilter();
    return this.rows().filter(r => {
      if (ef !== 'all' && r.estado !== ef) return false;
      if (!q) return true;
      return (r.clienteNombre ?? '').toLowerCase().includes(q) ||
             (r.numeroFactura ?? '').toLowerCase().includes(q);
    });
  });

  // ── KPIs ──────────────────────────────────────────────────────────────────
  protected readonly totalPredemanda = computed(() =>
    this.rows().filter(r => r.estado === 'predemanda').length,
  );
  protected readonly totalDemanda = computed(() =>
    this.rows().filter(r => r.estado === 'demanda').length,
  );
  protected readonly totalJuicio = computed(() =>
    this.rows().filter(r => r.estado === 'juicio').length,
  );
  protected readonly totalDeuda = computed(() =>
    this.rows().reduce((s, r) => s + r.importePendiente, 0),
  );

  // ── Constants ─────────────────────────────────────────────────────────────
  protected readonly estadoLabel = ESTADO_GESTION_IMPAGO_LABEL;
  protected readonly environment = { apiUrl: '/api' };

  constructor() {
    const s = this.listState.get<{ q: string; estadoFilter: string }>('lawsuits');
    if (s) { this.q.set(s.q); this.estadoFilter.set(s.estadoFilter); }
    this.load();
  }

  ngOnDestroy(): void {
    this.listState.save('lawsuits', { q: this.q(), estadoFilter: this.estadoFilter() });
  }

  // ── Load ──────────────────────────────────────────────────────────────────
  protected load(): void {
    this.loading.set(true);
    this.service.demandasJudicial().subscribe({
      next:  (list) => { this.rows.set(list); this.loading.set(false); },
      error: (err: HttpErrorResponse) => { this.error.set(extractMessage(err)); this.loading.set(false); },
    });
  }

  // ── Expand ────────────────────────────────────────────────────────────────
  protected toggleExpand(r: GestionImpago): void {
    if (this.expandedId() === r.id) {
      this.expandedId.set(null);
    } else {
      this.expandedId.set(r.id);
      if (!this.demandaForms[r.id]) {
        this.demandaForms[r.id] = {
          fechaEnvioDemanda: r.fechaEnvioDemanda ?? '',
          cantidadDemandada: r.cantidadDemandada != null
            ? r.cantidadDemandada.toString()
            : r.importePendiente.toFixed(2),
          abogadoResponsable: r.abogadoResponsable ?? '',
        };
      }
    }
  }

  // ── Save demanda info ─────────────────────────────────────────────────────
  protected saveDemandaInfo(r: GestionImpago): void {
    const form = this.demandaForms[r.id];
    if (!form) return;
    this.updatingId.set(r.id);
    this.service.actualizarDemandaInfo(r.id, {
      fechaEnvioDemanda: form.fechaEnvioDemanda || null,
      cantidadDemandada: form.cantidadDemandada ? parseFloat(form.cantidadDemandada) : null,
      abogadoResponsable: form.abogadoResponsable || null,
    }).subscribe({
      next: (updated) => {
        this.updatingId.set(null);
        this.notify.success('Información actualizada');
        this.rows.update(list => list.map(item => item.id === updated.id ? updated : item));
      },
      error: (err: HttpErrorResponse) => {
        this.updatingId.set(null);
        this.notify.error(extractMessage(err));
      },
    });
  }

  // ── Upload documents ──────────────────────────────────────────────────────
  protected uploadDocumentos(r: GestionImpago, event: Event): void {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    if (!files.length) return;
    this.uploadingId.set(r.id);
    const upload = (i: number) => {
      if (i >= files.length) { this.uploadingId.set(null); return; }
      this.service.uploadDocumento(r.id, files[i]).subscribe({
        next: (updated) => {
          this.rows.update(list => list.map(item => item.id === updated.id ? updated : item));
          upload(i + 1);
        },
        error: (err: HttpErrorResponse) => {
          this.notify.error(`Error subiendo ${files[i].name}: ${extractMessage(err)}`);
          upload(i + 1);
        },
      });
    };
    upload(0);
  }

  // ── Download document ─────────────────────────────────────────────────────
  protected downloadDoc(r: GestionImpago, doc: DemandaDocumento): void {
    const filename = doc.url.split('/').pop() ?? doc.nombre;
    this.service.downloadDocumento(r.id, filename).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = doc.nombre;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.notify.error('Error al descargar el documento'),
    });
  }

  // ── Delete document ───────────────────────────────────────────────────────
  protected deleteDocumento(r: GestionImpago, doc: DemandaDocumento): void {
    const filename = doc.url.split('/').pop() ?? '';
    if (!filename) return;
    this.service.deleteDocumento(r.id, filename).subscribe({
      next: (updated) => {
        this.rows.update(list => list.map(item => item.id === updated.id ? updated : item));
      },
      error: (err: HttpErrorResponse) => this.notify.error(extractMessage(err)),
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

  // ── Display helpers ───────────────────────────────────────────────────────
  protected formatEur(v: number): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency', currency: 'EUR', minimumFractionDigits: 0,
    }).format(v);
  }

  protected fmt(v: string | null): string {
    return v ? new Date(v).toLocaleDateString('es-ES') : '—';
  }

  protected formatBytes(bytes: number | undefined): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
}
