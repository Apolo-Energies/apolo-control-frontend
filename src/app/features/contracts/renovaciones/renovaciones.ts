import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { TableSkeleton } from '../../../shared/components/table-skeleton/table-skeleton';
import { StatusBadge, StatusTone } from '../../../shared/components/status-badge/status-badge';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { Icon } from '../../../shared/icons/icon';
import { ContractService } from '../../../core/services/contract.service';
import { ListStateService } from '../../../core/services/list-state.service';
import {
  Contract,
  ContractRenovaciones,
  ContractStatus,
  CONTRACT_STATUS_LABEL,
} from '../../../core/models';
import { formatDate, safeText } from '../../../shared/utils/format';
import { IconName } from '../../../shared/icons/icon';

const STATUS_TONE: Record<ContractStatus, StatusTone> = {
  previo: 'info',
  para_estudio: 'info',
  para_tramitar: 'warning',
  para_firma: 'warning',
  valido: 'success',
  confirmado: 'info',
  activo: 'success',
  renovado: 'purple',
  finalizado: 'neutral',
  baja: 'neutral',
  ko: 'danger',
  rechazado: 'danger',
  incidencia: 'warning',
  desestimado: 'danger',
  anulado: 'neutral',
  sin_estado: 'neutral',
};

function extractMessage(err: HttpErrorResponse): string {
  return (err.error as { message?: string })?.message ?? err.message ?? 'Error inesperado';
}

const SIZE = 10;

type SortDir = 'asc' | 'desc';
type SortCol = 'clienteNombre' | 'clienteDelegacion' | 'cups' | 'estado'
             | 'fechaInicio' | 'fechaFinPrevista' | 'fechaEstado' | 'consumoTotal';

@Component({
  selector: 'app-renovaciones',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, TableSkeleton, StatusBadge, Pagination, Icon, FormsModule],
  templateUrl: './renovaciones.html',
})
export class Renovaciones implements OnDestroy {
  private readonly service    = inject(ContractService);
  private readonly router     = inject(Router);
  private readonly listState  = inject(ListStateService);
  private readonly searchChange$ = new Subject<void>();

  protected readonly loading = signal(false);
  protected readonly data = signal<ContractRenovaciones | null>(null);
  protected readonly error = signal<string | null>(null);

  // Pagination
  protected readonly vPage = signal(0);
  protected readonly pvPage = signal(0);
  protected readonly rPage = signal(0);
  protected readonly pageSize = signal(SIZE);

  // Collapsible sections
  protected readonly vOpen = signal(true);
  protected readonly pvOpen = signal(true);
  protected readonly rOpen = signal(true);

  // Filters
  protected readonly q = signal('');
  protected readonly fechaDesde = signal('');
  protected readonly fechaHasta = signal('');
  protected readonly filterCandidatos = signal(false);
  protected readonly filterDelegacion = signal('');
  protected readonly filterEstado = signal<ContractStatus | ''>('');

  // Sort
  protected readonly sortCol = signal<SortCol | null>(null);
  protected readonly sortDir = signal<SortDir>('asc');

  /** Delegaciones únicas derivadas de la página actual */
  protected readonly delegaciones = computed<string[]>(() => {
    const d = this.data();
    if (!d) return [];
    const set = new Set<string>();
    for (const row of [...d.vencidos.content, ...d.porVencer.content, ...d.renovados.content]) {
      if (row.clienteDelegacion) set.add(row.clienteDelegacion);
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'es'));
  });

  /** Estados únicos derivados de la página actual */
  protected readonly estados = computed<ContractStatus[]>(() => {
    const d = this.data();
    if (!d) return [];
    const set = new Set<ContractStatus>();
    for (const row of [...d.vencidos.content, ...d.porVencer.content, ...d.renovados.content]) {
      if (row.estado) set.add(row.estado);
    }
    return [...set].sort((a, b) => (CONTRACT_STATUS_LABEL[a] ?? a).localeCompare(CONTRACT_STATUS_LABEL[b] ?? b, 'es'));
  });

  constructor() {
    this.searchChange$.pipe(debounceTime(400), takeUntilDestroyed()).subscribe(() => {
      this.resetPages();
      this.load();
    });
    const s = this.listState.get<{
      q: string; fechaDesde: string; fechaHasta: string;
      vPage: number; pvPage: number; rPage: number; pageSize: number;
    }>('renovaciones');
    if (s) {
      this.q.set(s.q);
      this.fechaDesde.set(s.fechaDesde);
      this.fechaHasta.set(s.fechaHasta);
      this.vPage.set(s.vPage);
      this.pvPage.set(s.pvPage);
      this.rPage.set(s.rPage);
      this.pageSize.set(s.pageSize);
    }
    this.load();
  }

  ngOnDestroy(): void {
    this.listState.save('renovaciones', {
      q: this.q(), fechaDesde: this.fechaDesde(), fechaHasta: this.fechaHasta(),
      vPage: this.vPage(), pvPage: this.pvPage(), rPage: this.rPage(), pageSize: this.pageSize(),
    });
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.getRenovaciones({
      vPage: this.vPage(), vSize: this.pageSize(),
      pvPage: this.pvPage(), pvSize: this.pageSize(),
      rPage: this.rPage(), rSize: this.pageSize(),
      q: this.q() || undefined,
      fechaDesde: this.fechaDesde() || undefined,
      fechaHasta: this.fechaHasta() || undefined,
    }).subscribe({
      next: (d) => { this.data.set(d); this.loading.set(false); },
      error: (err: HttpErrorResponse) => { this.error.set(extractMessage(err)); this.loading.set(false); },
    });
  }

  protected onQChange(): void { this.searchChange$.next(); }

  protected onDateChange(): void {
    this.resetPages();
    this.load();
  }

  protected clearFilters(): void {
    this.q.set('');
    this.fechaDesde.set('');
    this.fechaHasta.set('');
    this.filterCandidatos.set(false);
    this.filterDelegacion.set('');
    this.filterEstado.set('');
    this.resetPages();
    this.load();
  }

  protected get hasFilters(): boolean {
    return !!(this.q() || this.fechaDesde() || this.fechaHasta() || this.filterCandidatos()
      || this.filterDelegacion() || this.filterEstado());
  }

  private resetPages(): void {
    this.vPage.set(0); this.pvPage.set(0); this.rPage.set(0);
  }

  protected onVPage(p: number): void { this.vPage.set(p); this.load(); }
  protected onPvPage(p: number): void { this.pvPage.set(p); this.load(); }
  protected onRPage(p: number): void { this.rPage.set(p); this.load(); }

  protected onSizeChange(size: number): void {
    this.pageSize.set(size);
    this.resetPages();
    this.load();
  }

  protected refresh(): void {
    this.resetPages();
    this.load();
  }

  protected renovar(contract: Contract): void {
    void this.router.navigate(['/contracts'], { queryParams: { renovar: contract.id } });
  }

  protected verContrato(id: string): void {
    void this.router.navigate(['/contracts'], { queryParams: { id } });
  }

  // ── Sort & filter ─────────────────────────────────────────────────────────

  protected setSort(col: SortCol): void {
    if (this.sortCol() === col) {
      this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortCol.set(col);
      this.sortDir.set('asc');
    }
  }

  /** Aplica filtros (candidatos, delegación, estado) + sort a una lista de contratos. */
  protected applyRows(rows: Contract[], applyCandidatos = false): Contract[] {
    let result = rows;
    if (applyCandidatos && this.filterCandidatos()) {
      result = result.filter(r =>
        r.fechaFinReal && r.fechaFinPrevista && r.fechaFinReal === r.fechaFinPrevista,
      );
    }
    const deleg = this.filterDelegacion();
    if (deleg) result = result.filter(r => r.clienteDelegacion === deleg);
    const estado = this.filterEstado();
    if (estado) result = result.filter(r => r.estado === estado);
    const col = this.sortCol();
    if (!col) return result;
    const dir = this.sortDir() === 'asc' ? 1 : -1;
    return [...result].sort((a, b) => {
      const va = (a[col] ?? '') as string | number;
      const vb = (b[col] ?? '') as string | number;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb), 'es', { numeric: true }) * dir;
    });
  }

  // ── Formatting ────────────────────────────────────────────────────────────

  protected tone(status: ContractStatus): StatusTone { return STATUS_TONE[status] ?? 'neutral'; }
  protected label(status: ContractStatus): string { return CONTRACT_STATUS_LABEL[status] ?? status; }
  protected date(v: string | null): string { return formatDate(v); }
  protected text(v: string | null): string { return safeText(v); }

  protected consumo(v: number | null): string {
    if (v == null) return '—';
    if (v >= 1000) return `${(v / 1000).toFixed(1)} GWh`;
    return `${v.toFixed(1)} MWh`;
  }

  protected sortIcon(col: SortCol): IconName {
    if (this.sortCol() !== col) return 'arrow-down';
    return this.sortDir() === 'asc' ? 'arrow-up' : 'arrow-down';
  }

  protected sortIconClass(col: SortCol): string {
    return this.sortCol() === col ? 'text-primary' : 'opacity-25';
  }
}
