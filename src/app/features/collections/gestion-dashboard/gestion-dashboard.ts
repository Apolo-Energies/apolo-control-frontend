import {
  ChangeDetectionStrategy, Component, computed, inject, signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { PageHeader }    from '../../../shared/components/page-header/page-header';
import { KpiCard }       from '../../../shared/components/kpi-card/kpi-card';
import { StatusBadge, StatusTone } from '../../../shared/components/status-badge/status-badge';
import { EmptyState }    from '../../../shared/components/empty-state/empty-state';
import { Icon }          from '../../../shared/icons/icon';
import { BarChart, BarChartItem } from '../../../shared/components/bar-chart/bar-chart';
import { DonutChart, DonutChartItem } from '../../../shared/components/donut-chart/donut-chart';
import { LineChart, LineChartSeries } from '../../../shared/components/line-chart/line-chart';

import { AuthService } from '../../../core/auth/auth.service';
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
  imports: [PageHeader, KpiCard, StatusBadge, EmptyState, Icon, FormsModule, RouterLink, BarChart, DonutChart, LineChart],
  templateUrl: './gestion-dashboard.html',
})
export class GestionDashboard {
  private readonly service = inject(GestionImpagoService);
  private readonly auth    = inject(AuthService);

  protected readonly isAdmin = computed(() => this.auth.hasRole('admin'));

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

  // ── Bar chart: Deuda por estado ───────────────────────────────────────────
  private readonly BAR_ROWS: { label: string; color: string; getValue: (s: GestionImpagoStats) => number }[] = [
    { label: 'Pagado',         color: '#10b981', getValue: s => s.importePagado            ?? 0 },
    { label: 'Otros',          color: '#6b7280', getValue: s => s.importeOtros             ?? 0 },
    { label: 'Acuerdo Formal', color: '#8b5cf6', getValue: s => s.importeOvc               ?? 0 },
    { label: 'Acuerdo de Pago',color: '#3b82f6', getValue: s => s.importeAcuerdoPago       ?? 0 },
    { label: 'Acuerdo Verbal', color: '#0ea5e9', getValue: s => s.importeVaAPagar          ?? 0 },
    { label: 'Aviso corte',    color: '#f59e0b', getValue: s => s.importeAvisoCorte        ?? 0 },
    { label: 'Corte',          color: '#ef4444', getValue: s => s.importeCortado           ?? 0 },
    { label: 'Remesar nueva.', color: '#eab308', getValue: s => s.importeRemesarNuevamente ?? 0 },
    { label: 'Demanda',        color: '#dc2626', getValue: s => s.importeDemanda           ?? 0 },
    { label: 'Nuevo',          color: '#94a3b8', getValue: s => s.importeNuevo             ?? 0 },
  ];

  private readonly barRowsSorted = computed(() => {
    const s = this.stats();
    if (!s) return [];
    return this.BAR_ROWS
      .map(r => ({ ...r, value: r.getValue(s) }))
      .filter(r => r.value > 0)
      .sort((a, b) => b.value - a.value);
  });

  protected readonly barChartData = computed<BarChartItem[]>(() =>
    this.barRowsSorted().map(r => ({ label: r.label, value: r.value, formattedValue: this.formatEur(r.value) }))
  );

  protected readonly barChartColors = computed<string[]>(() =>
    this.barRowsSorted().map(r => r.color)
  );

  protected readonly barChartLegend = computed(() =>
    this.barRowsSorted().map(r => ({ label: r.label, value: r.value, color: r.color }))
  );

  // ── Donut chart: Antigüedad de deuda ─────────────────────────────────────
  protected readonly antiguedadData = computed<DonutChartItem[]>(() => {
    const s = this.stats();
    if (!s) return [];
    const buckets: DonutChartItem[] = [
      { id: '0a30',   label: '0-30 días',   value: s.importe0a30   ?? 0, color: '#3b82f6' },
      { id: '31a60',  label: '31-60 días',  value: s.importe31a60  ?? 0, color: '#06b6d4' },
      { id: '61a90',  label: '61-90 días',  value: s.importe61a90  ?? 0, color: '#f59e0b' },
      { id: '91a180', label: '91-180 días', value: s.importe91a180 ?? 0, color: '#ef4444' },
      { id: 'mas180', label: '+180 días',   value: s.importeMas180 ?? 0, color: '#8b5cf6' },
    ];
    return buckets.filter(b => b.value > 0);
  });

  // ── Line chart: Histórico mensual ─────────────────────────────────────────
  protected readonly lineLabels = computed<string[]>(() => {
    const hist = this.stats()?.historicoMensual ?? [];
    return hist.map(h => this.formatMes(h.mes));
  });

  protected readonly lineSeries = computed<LineChartSeries[]>(() => {
    const hist = this.stats()?.historicoMensual ?? [];
    return [
      { label: 'Impagos', color: '#3b82f6', values: hist.map(h => h.impagos ?? 0) },
      { label: 'Cobrado', color: '#10b981', values: hist.map(h => h.cobrado ?? 0) },
    ];
  });

  private formatMes(yyyymm: string): string {
    const [y, m] = yyyymm.split('-');
    const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${months[parseInt(m, 10) - 1]} ${y.slice(2)}`;
  }

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
