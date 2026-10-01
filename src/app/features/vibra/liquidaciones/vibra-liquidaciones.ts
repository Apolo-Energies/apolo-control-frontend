import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { TableSkeleton } from '../../../shared/components/table-skeleton/table-skeleton';
import { Icon } from '../../../shared/icons/icon';

import { VibraLiquidacionService } from '../../../core/services/vibra-liquidacion.service';
import { VibraAltaService } from '../../../core/services/vibra-alta.service';
import { VibraDashboardService } from '../../../core/services/vibra-dashboard.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Page, VibraLiquidacion } from '../../../core/models';

@Component({
  selector: 'app-vibra-liquidaciones',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, PageHeader, Pagination, TableSkeleton, Icon],
  templateUrl: './vibra-liquidaciones.html',
})
export class VibraLiquidaciones {
  private readonly service = inject(VibraLiquidacionService);
  private readonly altaService = inject(VibraAltaService);
  private readonly dashboardService = inject(VibraDashboardService);
  private readonly notify = inject(NotificationService);

  protected readonly result = signal<Page<VibraLiquidacion> | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly page = signal(0);
  protected readonly size = signal(20);
  protected q = '';
  protected colaboradorFilter = '';
  protected liquidadoFilter = '';

  protected readonly colaboradores = signal<string[]>([]);
  protected readonly sortField = signal<string>('fecha');
  protected readonly sortDir = signal<'asc' | 'desc'>('desc');

  protected readonly liquidadoOpts = ['No pagado', 'Pagado', 'Sí', 'No', 'Liquidado', 'No Liquidado'];

  protected setSort(field: string): void {
    if (this.sortField() === field) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDir.set('desc');
    }
    this.page.set(0);
    this.load();
  }

  protected readonly rows = computed(() => this.result()?.content ?? []);
  protected readonly total = computed(() => this.result()?.totalElements ?? 0);
  protected readonly totalPages = computed(() => this.result()?.totalPages ?? 0);

  constructor() {
    this.load();
    this.loadColaboradores();
  }

  private loadColaboradores(): void {
    this.dashboardService.get().subscribe({
      next: (d) => this.colaboradores.set(d.ranking.map(r => r.colaborador)),
      error: () => this.colaboradores.set([]),
    });
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.list(
      { q: this.q, colaborador: this.colaboradorFilter || undefined, liquidado: this.liquidadoFilter || undefined },
      { page: this.page(), size: this.size(), sort: `${this.sortField()},${this.sortDir()}` },
    ).subscribe({
      next: (r) => { this.result.set(r); this.loading.set(false); },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message ?? err.message ?? 'Error al cargar');
        this.loading.set(false);
      },
    });
  }

  protected onPage(p: number): void { this.page.set(p); this.load(); }
  protected onPageSize(s: number): void { this.size.set(s); this.page.set(0); this.load(); }
  protected applyFilters(): void { this.page.set(0); this.load(); }

  protected changeLiquidado(r: VibraLiquidacion, liquidado: string): void {
    this.altaService.marcarLiquidado(r.id, { liquidado }).subscribe({
      next: () => { this.notify.success('Estado actualizado'); this.load(); },
      error: (err: HttpErrorResponse) => this.notify.error(err.error?.message ?? 'Error'),
    });
  }

  protected exportExcel(): void {
    this.service.exportExcel({
      q: this.q, colaborador: this.colaboradorFilter || undefined,
      liquidado: this.liquidadoFilter || undefined,
    }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'vibra-liquidaciones.xlsx';
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
      },
      error: () => this.notify.error('Error al descargar Excel'),
    });
  }

  protected fmtNumber(n: number | null): string {
    if (n == null) return '—';
    return new Intl.NumberFormat('es-ES').format(n);
  }
}
