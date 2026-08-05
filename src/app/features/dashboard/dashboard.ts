import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { PageHeader } from '../../shared/components/page-header/page-header';
import { Icon, IconName } from '../../shared/icons/icon';
import { BarChart, BarChartItem } from '../../shared/components/bar-chart/bar-chart';
import { DonutChart, DonutChartItem } from '../../shared/components/donut-chart/donut-chart';
import { Pagination } from '../../shared/components/pagination/pagination';
import { TableSkeleton } from '../../shared/components/table-skeleton/table-skeleton';
import { LoadingOverlay } from '../../shared/components/loading-overlay/loading-overlay';
import {
  ApoloDecimalPipe,
  ApoloEnergyPipe,
  ApoloEuroPipe,
  ApoloIntegerPipe,
  ApoloMwhPipe,
} from '../../shared/pipes';
import { DashboardService } from '../../core/services/dashboard.service';
import { MasterDataService } from '../../core/services/master-data.service';
import { GestionImpagoService } from '../../core/services/gestion-impago.service';
import {
  ActividadDelegacion,
  ApiErrorResponse,
  ContractStatus,
  CONTRACT_STATUS_LABEL,
  DashboardFilter,
  DashboardSummary,
  GestionImpagoStats,
  Page,
} from '../../core/models';
import { formatEnergy, formatMonthShort, formatMwh } from '../../shared/utils/format';

type RangeId = 'today' | 'week' | 'month' | 'year' | 'all';

interface RangeOption {
  id: RangeId;
  label: string;
}

/** Genera N colores HSL equidistantes en el círculo cromático — sin repeticiones. */
function generatePalette(count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const hue = Math.round((i * 360) / count);
    return `hsl(${hue}, 70%, 55%)`;
  });
}

interface StatusStripItem {
  status: ContractStatus;
  label: string;
  total: number;
  mwh: number;
  mwhAnual: number;
  pct: number;
  color: string;
  colorSoft: string;
  icon: IconName;
}

const STATUS_DISPLAY_ORDER: ContractStatus[] = [
  'previo',
  'para_estudio',
  'para_tramitar',
  'para_firma',
  'valido',
  'confirmado',
  'activo',
  'renovado',
  'finalizado',
  'baja',
  'ko',
  'rechazado',
  'incidencia',
  'desestimado',
  'sin_estado',
];

/**
 * Estados que NO se incluyen en "Total Venta Bruta":
 *  - finalizado: contratos ya cerrados, no son venta vigente
 *  - sin_estado: contratos sin clasificar, no representan venta real
 */
const BRUTO_EXCLUDED_STATUSES: readonly ContractStatus[] = ['finalizado', 'sin_estado'];

const STATUS_COLORS: Record<ContractStatus, { color: string; colorSoft: string; icon: IconName }> = {
  previo:        { color: '#06b6d4', colorSoft: 'rgba(6, 182, 212, 0.12)',    icon: 'circle' },
  para_estudio:  { color: '#0ea5e9', colorSoft: 'rgba(14, 165, 233, 0.12)',   icon: 'eye' },
  para_tramitar: { color: '#eab308', colorSoft: 'rgba(234, 179, 8, 0.12)',    icon: 'file-text' },
  para_firma:    { color: '#f59e0b', colorSoft: 'rgba(245, 158, 11, 0.12)',   icon: 'file-text' },
  valido:        { color: '#22c55e', colorSoft: 'rgba(34, 197, 94, 0.12)',    icon: 'check' },
  confirmado:    { color: '#14b8a6', colorSoft: 'rgba(20, 184, 166, 0.12)',   icon: 'check' },
  activo:        { color: '#10b981', colorSoft: 'rgba(16, 185, 129, 0.12)',   icon: 'check' },
  renovado:      { color: '#8b5cf6', colorSoft: 'rgba(139, 92, 246, 0.12)',   icon: 'refresh-cw' },
  finalizado:    { color: '#6b7280', colorSoft: 'rgba(107, 114, 128, 0.12)',  icon: 'circle' },
  baja:          { color: '#94a3b8', colorSoft: 'rgba(148, 163, 184, 0.14)',  icon: 'trending-down' },
  ko:            { color: '#ef4444', colorSoft: 'rgba(239, 68, 68, 0.12)',    icon: 'x' },
  rechazado:     { color: '#dc2626', colorSoft: 'rgba(220, 38, 38, 0.12)',    icon: 'x' },
  incidencia:    { color: '#f97316', colorSoft: 'rgba(249, 115, 22, 0.12)',   icon: 'alert-triangle' },
  desestimado:   { color: '#f43f5e', colorSoft: 'rgba(244, 63, 94, 0.12)',    icon: 'x' },
  anulado:       { color: '#6b7280', colorSoft: 'rgba(107, 114, 128, 0.12)',  icon: 'x' },
  sin_estado:    { color: '#9ca3af', colorSoft: 'rgba(156, 163, 175, 0.12)',  icon: 'info' },
};

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    PageHeader,
    Icon,
    BarChart,
    DonutChart,
    Pagination,
    TableSkeleton,
    LoadingOverlay,
    ApoloIntegerPipe,
    ApoloDecimalPipe,
    ApoloMwhPipe,
    ApoloEnergyPipe,
    ApoloEuroPipe,
  ],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly service       = inject(DashboardService);
  private readonly masterData    = inject(MasterDataService);
  private readonly impagoService = inject(GestionImpagoService);
  private readonly router        = inject(Router);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly data = signal<DashboardSummary | null>(null);
  protected readonly range = signal<RangeId>('all');

  // ── Impagos stats ─────────────────────────────────────────────────────────
  protected readonly impagoStats        = signal<GestionImpagoStats | null>(null);
  protected readonly impagoStatsLoading = signal(false);

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

  // ── Actividad por delegaciones ────────────────────────────────────────────
  protected readonly actividadLoading = signal(false);
  protected readonly actividadData = signal<Page<ActividadDelegacion> | null>(null);
  protected readonly actividadPage = signal(0);
  protected readonly actividadSize = signal(20);
  protected actividadStartDate = '';
  protected actividadEndDate = '';

  protected readonly actividadRows = computed(() => this.actividadData()?.content ?? []);
  protected readonly actividadTotal = computed(() => this.actividadData()?.totalElements ?? 0);
  protected readonly actividadTotalPages = computed(() => this.actividadData()?.totalPages ?? 0);

  protected readonly ranges: RangeOption[] = [
    { id: 'today', label: 'Hoy' },
    { id: 'week',  label: 'Semana' },
    { id: 'month', label: 'Mes' },
    { id: 'year',  label: 'Año' },
    { id: 'all',   label: 'Histórico' },
  ];

  protected readonly totalBrutoMwh = computed(() => {
    const d = this.data();
    if (!d) return 0;
    return sumValues(d.contratos.consumoContratoMwhPorEstado, BRUTO_EXCLUDED_STATUSES);
  });

  protected readonly totalBrutoAnualMwh = computed(() => {
    const d = this.data();
    if (!d) return 0;
    return sumValues(d.contratos.consumoAnualMwhPorEstado, BRUTO_EXCLUDED_STATUSES);
  });

  protected readonly totalActivasMwh = computed(() => {
    const d = this.data();
    if (!d) return 0;
    return d.contratos.consumoContratoMwhPorEstado?.activo ?? 0;
  });

  protected readonly totalActivasAnualMwh = computed(() => {
    const d = this.data();
    if (!d) return 0;
    return d.contratos.consumoAnualMwhPorEstado?.activo ?? 0;
  });

  protected readonly statusStrip = computed<StatusStripItem[]>(() => {
    const d = this.data();
    if (!d) return [];
    const totalContratos = d.contratos.total || 1;
    return STATUS_DISPLAY_ORDER
      .filter((status) => (d.contratos.porEstado[status] ?? 0) > 0)
      .map((status) => {
        const total = d.contratos.porEstado[status] ?? 0;
        return {
          status,
          label: CONTRACT_STATUS_LABEL[status],
          total,
          mwh: d.contratos.consumoContratoMwhPorEstado?.[status] ?? 0,
          mwhAnual: d.contratos.consumoAnualMwhPorEstado?.[status] ?? 0,
          pct: Math.round((total / totalContratos) * 1000) / 10,
          color: STATUS_COLORS[status].color,
          colorSoft: STATUS_COLORS[status].colorSoft,
          icon: STATUS_COLORS[status].icon,
        };
      });
  });

  protected readonly donutData = computed<DonutChartItem[]>(() =>
    this.statusStrip().map((item) => ({
      id: item.status,
      label: item.label,
      value: item.total,
      color: item.color,
    })),
  );

  protected readonly koDonutData = computed<DonutChartItem[]>(() => {
    const d = this.data();
    if (!d?.kosPorMotivo) return [];
    const entries = Object.entries(d.kosPorMotivo).sort(([, a], [, b]) => b - a);
    const palette = generatePalette(entries.length);
    return entries.map(([motivo, count], i) => ({
      id: motivo,
      label: motivo,
      value: count,
      color: palette[i],
    }));
  });

  protected readonly brutoChartData = computed<BarChartItem[]>(() => {
    const d = this.data();
    if (!d) return [];
    return d.consumoMensualBruto.map((row) => {
      const energy = formatEnergy(row.consumoMwh);
      return {
        label: formatMonthShort(row.mes),
        value: row.consumoMwh,
        formattedValue: `${energy.value} ${energy.unit}`,
        hint: `${row.totalContratos} ctr.`,
        tooltip: `${formatMwh(row.consumoMwh)} · ${row.totalContratos} contratos`,
      };
    });
  });

  protected readonly activoChartData = computed<BarChartItem[]>(() => {
    const d = this.data();
    if (!d) return [];
    return d.consumoMensualActivo.map((row) => {
      const energy = formatEnergy(row.consumoMwh);
      return {
        label: formatMonthShort(row.mes),
        value: row.consumoMwh,
        formattedValue: `${energy.value} ${energy.unit}`,
        hint: `${row.totalContratos} ctr.`,
        tooltip: `${formatMwh(row.consumoMwh)} · ${row.totalContratos} contratos`,
      };
    });
  });

  protected readonly impagoChartData = computed<BarChartItem[]>(() =>
    (this.impagoStats()?.historicoMensual ?? []).map(row => ({
      label: formatMonthShort(row.mes),
      value: row.impagos,
      formattedValue: this.fmtEur(row.impagos),
      tooltip: `Impagos ${row.mes}: ${this.fmtEur(row.impagos)}`,
    })),
  );

  protected readonly cobradoChartData = computed<BarChartItem[]>(() =>
    (this.impagoStats()?.historicoMensual ?? []).map(row => ({
      label: formatMonthShort(row.mes),
      value: row.cobrado,
      formattedValue: this.fmtEur(row.cobrado),
      tooltip: `Cobrado ${row.mes}: ${this.fmtEur(row.cobrado)}`,
    })),
  );

  constructor() {
    this.reload();
    this.reloadActividad(0);
    this.loadImpagoStats();
  }

  protected setRange(id: RangeId): void {
    if (this.range() === id) return;
    this.range.set(id);
    const now = new Date();
    if (id === 'week')  this.selectedWeek.set(toIsoWeek(now));
    if (id === 'month') this.selectedMonth.set(toIsoMonth(now));
    if (id === 'year')  this.selectedYear.set(now.getFullYear());
    this.reload();
  }

  protected onWeekChange(e: Event): void {
    this.selectedWeek.set((e.target as HTMLInputElement).value);
    this.reload();
  }

  protected onMonthChange(e: Event): void {
    this.selectedMonth.set((e.target as HTMLInputElement).value);
    this.reload();
  }

  protected onYearChange(e: Event): void {
    this.selectedYear.set(+(e.target as HTMLSelectElement).value);
    this.reload();
  }

  protected reload(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.service.summary(this.buildFilter()).subscribe({
      next: (response) => {
        this.data.set(response);
        this.masterData.mergeMotivos(Object.keys(response.kosPorMotivo ?? {}));
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(extractMessage(err));
        this.loading.set(false);
      },
    });
  }

  protected reloadActividad(page: number): void {
    this.actividadPage.set(page);
    this.actividadLoading.set(true);
    this.service
      .actividadDelegaciones(
        {
          startDate: this.actividadStartDate || undefined,
          endDate: this.actividadEndDate || undefined,
        },
        { page, size: this.actividadSize(), sort: 'fecha,desc' },
      )
      .subscribe({
        next: (res) => {
          this.actividadData.set(res);
          this.actividadLoading.set(false);
        },
        error: () => this.actividadLoading.set(false),
      });
  }

  protected onActividadSizeChange(size: number): void {
    this.actividadSize.set(size);
    this.reloadActividad(0);
  }

  protected count(d: DashboardSummary, status: ContractStatus): number {
    return d.contratos.porEstado[status] ?? 0;
  }

  protected onKoChartClick(motivo: string): void {
    void this.router.navigate(['/contracts'], {
      queryParams: { status: 'ko', motivoRechazo: motivo },
    });
  }

  protected loadImpagoStats(): void {
    this.impagoStatsLoading.set(true);
    this.impagoService.stats().subscribe({
      next:  (s) => { this.impagoStats.set(s); this.impagoStatsLoading.set(false); },
      error: ()  => this.impagoStatsLoading.set(false),
    });
  }

  private fmtEur(v: number): string {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(v ?? 0);
  }

  private buildFilter(): DashboardFilter {
    const range = this.range();
    if (range === 'all') return {};
    const today = new Date();
    switch (range) {
      case 'today': {
        const d = toIsoDate(today);
        return { startDate: d, endDate: d };
      }
      case 'week': {
        const { start, end } = weekBounds(this.selectedWeek());
        return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
      }
      case 'month': {
        const [y, mo] = this.selectedMonth().split('-').map(Number);
        return { startDate: `${this.selectedMonth()}-01`, endDate: toIsoDate(new Date(y, mo, 0)) };
      }
      case 'year': {
        const y = this.selectedYear();
        return { startDate: `${y}-01-01`, endDate: `${y}-12-31` };
      }
    }
  }
}

function sumValues(
  record: Partial<Record<ContractStatus, number>> | null | undefined,
  exclude: readonly ContractStatus[] = [],
): number {
  if (!record) {
    return 0;
  }
  return (Object.entries(record) as [ContractStatus, number | undefined][])
    .filter(([key]) => !exclude.includes(key))
    .reduce<number>((acc, [, v]) => acc + (v ?? 0), 0);
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
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

function extractMessage(error: HttpErrorResponse): string {
  const body = error.error as ApiErrorResponse | undefined;
  if (body?.message) {
    return body.message;
  }
  if (error.status === 0) {
    return 'No se puede conectar con el servidor';
  }
  return error.message || 'Error al cargar el dashboard';
}
