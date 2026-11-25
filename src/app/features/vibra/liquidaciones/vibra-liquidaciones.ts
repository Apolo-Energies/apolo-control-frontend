import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { ActionsMenu, ActionsMenuItem } from '../../../shared/components/actions-menu/actions-menu';
import { StatusBadge, StatusTone } from '../../../shared/components/status-badge/status-badge';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { TableSkeleton } from '../../../shared/components/table-skeleton/table-skeleton';
import { Icon } from '../../../shared/icons/icon';

import { VibraLiquidacionService } from '../../../core/services/vibra-liquidacion.service';
import { VibraAltaService } from '../../../core/services/vibra-alta.service';
import { VibraDashboardService } from '../../../core/services/vibra-dashboard.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Page, VibraLiquidacion } from '../../../core/models';
import { AuthService } from '../../../core/auth';
import { VibraLiquidacionMensualView } from './vibra-liquidacion-mensual';
import { formatDate } from '../../../shared/utils/format';

@Component({
  selector: 'app-vibra-liquidaciones',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, PageHeader, ActionsMenu, StatusBadge, Pagination, TableSkeleton, Icon, VibraLiquidacionMensualView],
  templateUrl: './vibra-liquidaciones.html',
})
export class VibraLiquidaciones {
  private readonly service = inject(VibraLiquidacionService);
  private readonly altaService = inject(VibraAltaService);
  private readonly dashboardService = inject(VibraDashboardService);
  private readonly notify = inject(NotificationService);
  private readonly auth = inject(AuthService);

  protected readonly isAdmin = this.auth.hasRole('admin');
  /** Pestaña visible: liquidación mensual (nueva) o la vista por alta. */
  protected readonly tab = signal<'mensual' | 'alta'>('mensual');

  protected readonly result = signal<Page<VibraLiquidacion> | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly page = signal(0);
  protected readonly size = signal(20);
  protected q = '';
  protected colaboradorFilter = '';
  protected liquidacionColaboradorFilter = '';

  protected readonly colaboradores = signal<string[]>([]);
  protected readonly sortField = signal<string>('fecha');
  protected readonly sortDir = signal<'asc' | 'desc'>('desc');

  protected readonly liquidacionColaboradorOpts = ['Pagado', 'No pagado'];

  /** Cabeceras de la vista por alta; `campo`: ordenable por ese campo del servidor. */
  protected readonly columnas: { label: string; campo?: string; num?: boolean }[] = [
    { label: 'Fecha', campo: 'fecha' },
    { label: 'Titular', campo: 'titular' },
    { label: 'Contacto', campo: 'email' },
    { label: 'Colaborador', campo: 'colaborador' },
    { label: 'Producto', campo: 'mesLiquidacion' }, // campo de orden heredado de la vista anterior
    { label: 'Consumo', campo: 'consumo', num: true },
    { label: 'Liq. colaborador', campo: 'liquidacionColaborador' },
  ];

  /** Menú de cada fila para marcar la liquidación al colaborador. */
  protected readonly menus = computed(() => new Map(!this.isAdmin ? [] : this.rows().map((r): [string, ActionsMenuItem[]] => [r.id,
    this.liquidacionColaboradorOpts.map((o): ActionsMenuItem => ({
      label: `Marcar ${o.toLowerCase()}`,
      icon: o === 'Pagado' ? 'check' : 'x',
      disabled: r.liquidacionColaborador === o,
      action: () => this.changeLiquidacionColaborador(r, o),
    }))])));

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

  private porAltaCargada = false;

  /** La vista por alta se carga la primera vez que se abre su pestaña. */
  protected abrirTab(tab: 'mensual' | 'alta'): void {
    this.tab.set(tab);
    if (tab === 'alta' && !this.porAltaCargada) {
      this.porAltaCargada = true;
      this.load();
      this.loadColaboradores();
    }
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
      { q: this.q, colaborador: this.colaboradorFilter || undefined, liquidacionColaborador: this.liquidacionColaboradorFilter || undefined },
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
  protected limpiar(): void {
    this.q = '';
    this.colaboradorFilter = '';
    this.liquidacionColaboradorFilter = '';
    this.applyFilters();
  }

  protected pagoTone(v: string | null): StatusTone {
    return v === 'Pagado' ? 'success' : v === 'No pagado' ? 'warning' : 'neutral';
  }

  protected readonly fecha = formatDate;

  protected changeLiquidacionColaborador(r: VibraLiquidacion, liquidacionColaborador: string): void {
    this.altaService.marcarLiquidacionColaborador(r.id, { liquidacionColaborador }).subscribe({
      next: () => { this.notify.success('Estado actualizado'); this.load(); },
      error: (err: HttpErrorResponse) => this.notify.error(err.error?.message ?? 'Error'),
    });
  }

  protected exportExcel(): void {
    this.service.exportExcel({
      q: this.q, colaborador: this.colaboradorFilter || undefined,
      liquidacionColaborador: this.liquidacionColaboradorFilter || undefined,
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
