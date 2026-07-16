import {
  ChangeDetectionStrategy, Component, inject, signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { PageHeader }    from '../../../shared/components/page-header/page-header';
import { KpiCard }       from '../../../shared/components/kpi-card/kpi-card';
import { StatusBadge, StatusTone } from '../../../shared/components/status-badge/status-badge';
import { EmptyState }    from '../../../shared/components/empty-state/empty-state';
import { Icon }          from '../../../shared/icons/icon';

import { GestionImpagoService } from '../../../core/services/gestion-impago.service';
import {
  GestionImpago, GestionImpagoStats,
  EstadoGestionImpago, ESTADO_GESTION_IMPAGO_LABEL, PRIORIDAD_GESTION_IMPAGO_LABEL,
} from '../../../core/models';

function estadoToneFn(estado: EstadoGestionImpago): StatusTone {
  switch (estado) {
    case 'pagado':       return 'success';
    case 'va_a_pagar':  return 'info';
    case 'acuerdo_pago':return 'info';
    case 'aviso_corte': return 'warning';
    case 'cortado':     return 'danger';
    case 'ovc':         return 'purple';
    case 'demanda':     return 'danger';
    case 'nuevo':       return 'neutral';
    default:            return 'neutral';
  }
}

@Component({
  selector: 'app-gestion-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, KpiCard, StatusBadge, EmptyState, Icon, FormsModule, RouterLink],
  templateUrl: './gestion-dashboard.html',
})
export class GestionDashboard {
  private readonly service = inject(GestionImpagoService);

  // ── Stats state ───────────────────────────────────────────────────────────
  protected readonly stats        = signal<GestionImpagoStats | null>(null);
  protected readonly statsLoading = signal(false);
  protected readonly statsError   = signal<string | null>(null);

  // ── Tareas state ──────────────────────────────────────────────────────────
  protected readonly tareas        = signal<GestionImpago[]>([]);
  protected readonly tareasLoading = signal(false);
  protected readonly tareasError   = signal<string | null>(null);

  // ── Tareas filter ─────────────────────────────────────────────────────────
  protected tareasQ = '';

  // ── Constants ─────────────────────────────────────────────────────────────
  protected readonly estadoLabel    = ESTADO_GESTION_IMPAGO_LABEL;
  protected readonly prioridadLabel = PRIORIDAD_GESTION_IMPAGO_LABEL;

  constructor() {
    this.loadStats();
    this.loadTareas();
  }

  // ── Load stats ────────────────────────────────────────────────────────────
  protected loadStats(): void {
    this.statsLoading.set(true);
    this.service.stats().subscribe({
      next:  (s) => { this.stats.set(s); this.statsLoading.set(false); },
      error: (err: HttpErrorResponse) => {
        this.statsError.set((err.error as { message?: string })?.message ?? err.message ?? 'Error');
        this.statsLoading.set(false);
      },
    });
  }

  // ── Load tareas ───────────────────────────────────────────────────────────
  protected loadTareas(q?: string): void {
    this.tareasLoading.set(true);
    this.service.tareas(q || undefined).subscribe({
      next:  (list) => { this.tareas.set(list); this.tareasLoading.set(false); },
      error: (err: HttpErrorResponse) => {
        this.tareasError.set((err.error as { message?: string })?.message ?? err.message ?? 'Error');
        this.tareasLoading.set(false);
      },
    });
  }

  protected searchTareas(): void { this.loadTareas(this.tareasQ); }
  protected clearTareas(): void  { this.tareasQ = ''; this.loadTareas(); }

  // ── Display helpers ───────────────────────────────────────────────────────
  protected estadoTone(estado: EstadoGestionImpago): StatusTone { return estadoToneFn(estado); }

  protected formatEur(v: number | undefined | null): string {
    if (v == null) return '—';
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v);
  }

  protected formatPct(v: number | undefined | null): string {
    if (v == null) return '—';
    return `${v.toFixed(1)} %`;
  }

  protected fmt(v: string | null): string {
    return v ? new Date(v).toLocaleDateString('es-ES') : '—';
  }
}
