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
    { label: 'Liquidaciones', description: 'Gestión de liquidaciones a colaboradores',
      url: '/vibra/liquidaciones', icon: 'wallet', tone: 'success' },
  ];

  protected readonly topRanking = computed<VibraRankingItem[]>(() =>
    (this.data()?.ranking ?? []).slice(0, 10),
  );

  constructor() {
    this.load();
    // Reconstruye el chart al cambiar data(); queueMicrotask espera a que el canvas esté visible.
    effect(() => {
      const top = this.topRanking();
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

    this.chart?.destroy();
    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: top.map(r => r.colaborador),
        datasets: [
          {
            label: 'Cantidad de contratos',
            data: top.map(r => r.contratos),
            backgroundColor: '#3b82f6',
            yAxisID: 'y',
          },
          {
            label: 'Consumo (kWh)',
            data: top.map(r => r.consumoTotal),
            backgroundColor: '#f59e0b',
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
            ticks: { precision: 0 },
          },
          y1: {
            type: 'linear', position: 'right', beginAtZero: true,
            grid: { drawOnChartArea: false },
          },
          x: {
            ticks: { autoSkip: false, maxRotation: 45, minRotation: 45 },
          },
        },
        plugins: {
          legend: { position: 'bottom' },
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
