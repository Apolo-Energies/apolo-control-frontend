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
import {
  ActividadDelegacion,
  ApiErrorResponse,
  ContractStatus,
  CONTRACT_STATUS_LABEL,
  DashboardFilter,
  DashboardSummary,
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
  private readonly service = inject(DashboardService);
  private readonly masterData = inject(MasterDataService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly data = signal<DashboardSummary | null>(null);
  protected readonly range = signal<RangeId>('all');

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

  constructor() {
    this.reload();
    this.reloadActividad(0);
  }

  protected setRange(id: RangeId): void {
    if (this.range() === id) {
      return;
    }
    this.range.set(id);
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

  private buildFilter(): DashboardFilter {
    const range = this.range();
    if (range === 'all') {
      return {};
    }
    const now = new Date();
    let start: Date;
    let end: Date;
    switch (range) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week': {
        const day = now.getDay() === 0 ? 6 : now.getDay() - 1;
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - day));
        break;
      }
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
    }
    return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
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
