import {
  ChangeDetectionStrategy, Component, computed, inject, signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';

import { PageHeader }  from '../../../shared/components/page-header/page-header';
import { KpiCard }     from '../../../shared/components/kpi-card/kpi-card';
import { EmptyState }  from '../../../shared/components/empty-state/empty-state';
import { Icon }        from '../../../shared/icons/icon';
import { DonutChart, DonutChartItem } from '../../../shared/components/donut-chart/donut-chart';

import { GestionImpagoService } from '../../../core/services/gestion-impago.service';
import { MasterDataService }    from '../../../core/services/master-data.service';
import { GestionEstadisticas, ESTADO_GESTION_IMPAGO_LABEL }  from '../../../core/models';

@Component({
  selector: 'app-gestion-estadisticas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, KpiCard, EmptyState, Icon, RouterLink, DonutChart],
  templateUrl: './gestion-estadisticas.html',
})
export class GestionEstadisticasPage {
  private readonly service    = inject(GestionImpagoService);
  protected readonly masterData = inject(MasterDataService);
  protected readonly estadoLabel = ESTADO_GESTION_IMPAGO_LABEL;

  protected readonly data    = signal<GestionEstadisticas | null>(null);
  protected readonly loading = signal(false);
  protected readonly error   = signal<string | null>(null);

  protected readonly DONUT_COLORS = [
    '#3b82f6', '#ef4444', '#f59e0b', '#10b981',
    '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16',
  ];

  protected readonly delegacionesAgrupadas = computed(() => {
    const d = this.data();
    if (!d?.porDelegacion?.length) return [];
    const delegaciones = this.masterData.delegaciones();
    const map = new Map<string | null, { pagado: number; total: number }>();
    for (const item of d.porDelegacion) {
      const key = item.delegacionId ?? null;
      const prev = map.get(key) ?? { pagado: 0, total: 0 };
      map.set(key, {
        total: prev.total + item.count,
        pagado: prev.pagado + (item.estado === 'pagado' ? item.count : 0),
      });
    }
    return [...map.entries()]
      .map(([id, counts]) => ({
        id,
        nombre: id ? (delegaciones.find(d => d.id === id)?.nombre ?? id) : 'Sin delegación',
        total: counts.total,
        pagado: counts.pagado,
        pendiente: counts.total - counts.pagado,
      }))
      .sort((a, b) => b.total - a.total);
  });

  protected readonly motivosDonut = computed<DonutChartItem[]>(() => {
    const d = this.data();
    if (!d) return [];
    return d.motivosDevolucion.slice(0, 8).map((m, i) => ({
      id: m.motivo,
      label: m.motivo,
      value: m.count,
      color: this.DONUT_COLORS[i % this.DONUT_COLORS.length],
    }));
  });

  constructor() { this.load(); }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.estadisticas().subscribe({
      next:  (d) => { this.data.set(d); this.loading.set(false); },
      error: (err: HttpErrorResponse) => {
        this.error.set((err.error as { message?: string })?.message ?? 'Error al cargar estadísticas');
        this.loading.set(false);
      },
    });
  }

  protected donutColor(i: number): string {
    return this.DONUT_COLORS[i % this.DONUT_COLORS.length];
  }

  protected formatHoras(h: number | null | undefined): string {
    if (h == null) return '—';
    if (h < 24) return `${h.toFixed(1)} h`;
    return `${(h / 24).toFixed(1)} días`;
  }

  protected formatPct(v: number | null | undefined): string {
    if (v == null) return '—';
    return `${v.toFixed(1)} %`;
  }

  protected formatNum(v: number | null | undefined): string {
    if (v == null) return '—';
    return v.toFixed(1);
  }
}
