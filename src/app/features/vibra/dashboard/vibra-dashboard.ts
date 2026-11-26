import {
  AfterViewInit, ChangeDetectionStrategy, Component, computed, effect,
  ElementRef, inject, OnDestroy, signal, ViewChild,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { KpiCard } from '../../../shared/components/kpi-card/kpi-card';
import { TableSkeleton } from '../../../shared/components/table-skeleton/table-skeleton';
import { Icon, IconName } from '../../../shared/icons/icon';

import { AuthService } from '../../../core/auth';
import { ThemeService } from '../../../shared/services/theme';
import { VibraDashboardService } from '../../../core/services/vibra-dashboard.service';
import { VibraDashboard as VibraDashboardData, VibraRankingItem } from '../../../core/models';

Chart.register(...registerables);

interface SectionCard {
  label: string;
  description: string;
  url: string;
  icon: IconName;
  tone: 'info' | 'success' | 'warning' | 'danger' | 'purple' | 'neutral';
}

@Component({
  selector: 'app-vibra-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeader, KpiCard, TableSkeleton, Icon],
  templateUrl: './vibra-dashboard.html',
})
export class VibraDashboard implements AfterViewInit, OnDestroy {
  private readonly service = inject(VibraDashboardService);
  private readonly auth = inject(AuthService);
  private readonly theme = inject(ThemeService);

  @ViewChild('chartCanvas') chartCanvas?: ElementRef<HTMLCanvasElement>;
  private chart: Chart | null = null;

  protected readonly data = signal<VibraDashboardData | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly sections: SectionCard[] = [
    { label: 'Preciario', description: 'Gestiona tarifas y precios de energía 2.0TD y 3.0TD',
      url: '/vibra/preciario', icon: 'euro', tone: 'purple' },
    { label: 'Contrato Servicio', description: 'Genera contratos de servicios energéticos para nuevos clientes',
      url: '/vibra/contrato-servicio', icon: 'file-plus', tone: 'info' },
    { label: 'Altas', description: 'Gestiona el alta de nuevos puntos de suministro',
      url: '/vibra/altas', icon: 'users', tone: 'success' },
    { label: 'Tramitación', description: 'Contratos pendientes de firma',
      url: '/vibra/tramitacion', icon: 'check-square', tone: 'warning' },
    { label: 'Impagos', description: 'Seguimiento y gestión de facturas pendientes de pago',
      url: '/vibra/impagos', icon: 'alert-triangle', tone: 'danger' },
    // Equipo y Liquidaciones: solo admin y contabilidad (comisiones de la red)
    ...(this.auth.hasRole('admin', 'contabilidad') ? [
      { label: 'Equipo', description: 'Colaboradores y su comisión por alta',
        url: '/vibra/equipo', icon: 'users' as IconName, tone: 'info' as const },
      { label: 'Liquidaciones', description: 'Liquidación mensual a colaboradores',
        url: '/vibra/liquidaciones', icon: 'wallet' as IconName, tone: 'success' as const },
    ] : []),
  ];

  protected readonly toneClass: Record<SectionCard['tone'], string> = {
    info: 'bg-info-soft text-info-fg',
    success: 'bg-success-soft text-success-fg',
    warning: 'bg-warning-soft text-warning-fg',
    danger: 'bg-danger-soft text-danger-fg',
    purple: 'bg-purple-soft text-purple-fg',
    neutral: 'bg-neutral-soft text-neutral-fg',
  };

  protected readonly topRanking = computed<VibraRankingItem[]>(() =>
    (this.data()?.ranking ?? []).slice(0, 10),
  );

  constructor() {
    this.load();
    // Reconstruye el chart al cambiar data() o el tema; queueMicrotask espera a que el canvas esté visible.
    effect(() => {
      const top = this.topRanking();
      this.theme.isDark(); // repinta con los colores del tema
      if (top.length === 0) return;
      queueMicrotask(() => {
        if (this.chartCanvas) this.renderChart(top);
      });
    });
  }

  ngAfterViewInit(): void {
    const top = this.topRanking();
    if (top.length > 0 && this.chartCanvas) this.renderChart(top);
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.get().subscribe({
      next: (d) => { this.data.set(d); this.loading.set(false); },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message ?? err.message ?? 'Error al cargar el dashboard');
        this.loading.set(false);
      },
    });
  }

  private renderChart(top: VibraRankingItem[]): void {
    if (!this.chartCanvas) return;
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    // Colores del tema actual (claro u oscuro)
    const css = getComputedStyle(document.documentElement);
    const token = (n: string, def: string) => css.getPropertyValue(n).trim() || def;
    const texto = token('--color-muted-foreground', '#a1a1aa');
    const rejilla = token('--color-border', '#3f3f46');

    this.chart?.destroy();
    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: top.map(r => r.colaborador),
        datasets: [
          {
            label: 'Contratos',
            data: top.map(r => r.contratos),
            backgroundColor: token('--color-info', '#12aff0'),
            borderRadius: 3,
            yAxisID: 'y',
          },
          {
            label: 'Consumo (kWh)',
            data: top.map(r => r.consumoTotal),
            backgroundColor: token('--color-warning', '#f59e0b'),
            borderRadius: 3,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          y: {
            type: 'linear', position: 'left', beginAtZero: true,
            ticks: { precision: 0, color: texto },
            grid: { color: rejilla },
            title: { display: true, text: 'Contratos', color: texto },
          },
          y1: {
            type: 'linear', position: 'right', beginAtZero: true,
            grid: { drawOnChartArea: false },
            ticks: { color: texto },
            title: { display: true, text: 'kWh', color: texto },
          },
          x: {
            ticks: { autoSkip: false, maxRotation: 45, minRotation: 0, color: texto },
            grid: { display: false },
          },
        },
        plugins: {
          legend: { position: 'bottom', labels: { color: texto } },
          tooltip: { enabled: true },
        },
      },
    });
  }

  protected formatNumber(n: number | null | undefined): string {
    if (n == null) return '—';
    return new Intl.NumberFormat('es-ES').format(n);
  }

  protected formatConsumo(n: number | null | undefined): string {
    if (n == null) return '—';
    return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(n);
  }
}
