import {
  ChangeDetectionStrategy, Component, computed, inject, signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

type RangeId = 'today' | 'week' | 'month' | 'year' | 'all';
interface RangeOption { id: RangeId; label: string; }

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
function toIsoWeek(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const year = d.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}
function toIsoMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
}
function weekBounds(isoWeek: string): { start: Date; end: Date } {
  const [yearStr, wStr] = isoWeek.split('-W');
  const year = +yearStr, week = +wStr;
  const jan4 = new Date(year, 0, 4);
  const dow = jan4.getDay() || 7;
  const mondayW1 = new Date(jan4);
  mondayW1.setDate(jan4.getDate() - dow + 1);
  const start = new Date(mondayW1);
  start.setDate(mondayW1.getDate() + (week - 1) * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}
function formatDayMonth(d: Date): string {
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

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

  // ── Date range filter ─────────────────────────────────────────────────────
  protected readonly range         = signal<RangeId>('all');
  protected readonly selectedWeek  = signal(toIsoWeek(new Date()));
  protected readonly selectedMonth = signal(toIsoMonth(new Date()));
  protected readonly selectedYear  = signal(new Date().getFullYear());
  protected readonly availableYears = Array.from(
    { length: new Date().getFullYear() - 2020 + 1 },
    (_, i) => new Date().getFullYear() - i,
  );
  protected readonly weekRangeLabel = computed(() => {
    const { start, end } = weekBounds(this.selectedWeek());
    return `${formatDayMonth(start)} – ${formatDayMonth(end)} ${start.getFullYear()}`;
  });
  protected readonly ranges: RangeOption[] = [
    { id: 'today', label: 'Hoy' },
    { id: 'week',  label: 'Semana' },
    { id: 'month', label: 'Mes' },
    { id: 'year',  label: 'Año' },
    { id: 'all',   label: 'Histórico' },
  ];

  protected setRange(id: RangeId): void {
    if (this.range() === id) return;
    this.range.set(id);
    const now = new Date();
    if (id === 'week')  this.selectedWeek.set(toIsoWeek(now));
    if (id === 'month') this.selectedMonth.set(toIsoMonth(now));
    if (id === 'year')  this.selectedYear.set(now.getFullYear());
    this.loadStats();
  }

  protected onWeekChange(e: Event): void {
    this.selectedWeek.set((e.target as HTMLInputElement).value);
    this.loadStats();
  }

  protected onMonthChange(e: Event): void {
    this.selectedMonth.set((e.target as HTMLInputElement).value);
    this.loadStats();
  }

  protected onYearChange(e: Event): void {
    this.selectedYear.set(+(e.target as HTMLSelectElement).value);
    this.loadStats();
  }

  private buildDateFilter(): { startDate?: string; endDate?: string } {
    const r = this.range();
    if (r === 'all') return {};
    const today = new Date();
    switch (r) {
      case 'today': { const d = toIsoDate(today); return { startDate: d, endDate: d }; }
      case 'week': {
        const w = this.selectedWeek();
        if (!w || !/^\d{4}-W\d{2}$/.test(w)) return {};
        const { start, end } = weekBounds(w);
        return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
      }
      case 'month': {
        const m = this.selectedMonth();
        if (!m || !/^\d{4}-\d{2}$/.test(m)) return {};
        const [y, mo] = m.split('-').map(Number);
        return { startDate: `${m}-01`, endDate: toIsoDate(new Date(y, mo, 0)) };
      }
      case 'year':  { const y = this.selectedYear(); return { startDate: `${y}-01-01`, endDate: `${y}-12-31` }; }
    }
  }

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
    this.service.stats(this.buildDateFilter()).subscribe({
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
