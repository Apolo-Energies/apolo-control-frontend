import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { KpiCard } from '../../../shared/components/kpi-card/kpi-card';
import { TableSkeleton } from '../../../shared/components/table-skeleton/table-skeleton';
import {
  GroupedBarChart,
  GroupedBarSeries,
} from '../../../shared/components/grouped-bar-chart/grouped-bar-chart';
import { Icon, IconName } from '../../../shared/icons/icon';

import { VibraDashboardService } from '../../../core/services/vibra-dashboard.service';
import { VibraDashboard as VibraDashboardData } from '../../../core/models';

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
  imports: [RouterLink, PageHeader, KpiCard, TableSkeleton, GroupedBarChart, Icon],
  templateUrl: './vibra-dashboard.html',
})
export class VibraDashboard {
  private readonly service = inject(VibraDashboardService);

  protected readonly data = signal<VibraDashboardData | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly sections: SectionCard[] = [
    {
      label: 'Preciario', description: 'Gestiona tarifas y precios de energía 2.0TD y 3.0TD',
      url: '/vibra/preciario', icon: 'euro', tone: 'purple',
    },
    {
      label: 'Contrato Servicio', description: 'Genera contratos de servicios energéticos para nuevos clientes',
      url: '/vibra/contrato-servicio', icon: 'file-plus', tone: 'info',
    },
    {
      label: 'Altas', description: 'Gestiona el alta de nuevos puntos de suministro',
      url: '/vibra/altas', icon: 'users', tone: 'success',
    },
    {
      label: 'Tramitación', description: 'Contratos pendientes de firma',
      url: '/vibra/tramitacion', icon: 'check-square', tone: 'warning',
    },
    {
      label: 'Impagos', description: 'Seguimiento y gestión de facturas pendientes de pago',
      url: '/vibra/impagos', icon: 'alert-triangle', tone: 'danger',
    },
    {
      label: 'Liquidaciones', description: 'Gestión de liquidaciones a colaboradores',
      url: '/vibra/liquidaciones', icon: 'wallet', tone: 'success',
    },
  ];

  // Ranking → labels + series
  protected readonly rankingLabels = computed<string[]>(() =>
    this.data()?.ranking.map(r => r.colaborador) ?? [],
  );

  protected readonly rankingSeries = computed<GroupedBarSeries[]>(() => {
    const ranking = this.data()?.ranking ?? [];
    return [
      { label: 'Contratos', color: '#3b82f6', values: ranking.map(r => r.contratos) },
      { label: 'Consumo (kWh)', color: '#f59e0b', values: ranking.map(r => r.consumoTotal) },
    ];
  });

  constructor() { this.load(); }

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

  protected formatNumber(n: number | null | undefined): string {
    if (n == null) return '—';
    return new Intl.NumberFormat('es-ES').format(n);
  }

  protected formatConsumo(n: number | null | undefined): string {
    if (n == null) return '—';
    return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(n);
  }
}
