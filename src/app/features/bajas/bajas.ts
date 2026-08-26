import {
  ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { PageHeader } from '../../shared/components/page-header/page-header';
import { TableSkeleton } from '../../shared/components/table-skeleton/table-skeleton';
import { Pagination } from '../../shared/components/pagination/pagination';
import { Icon } from '../../shared/icons/icon';
import { BajaDialog } from '../../shared/components/baja-dialog/baja-dialog';
import { BajaService } from '../../core/services/baja.service';
import { ContractService } from '../../core/services/contract.service';
import { ListStateService } from '../../core/services/list-state.service';
import { Contract, DelegacionBajaStats, Page } from '../../core/models';
import { formatDate, safeText } from '../../shared/utils/format';

function generateMonthOptions(): { label: string; value: string }[] {
  const opts: { label: string; value: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const value = `${year}-${String(month).padStart(2, '0')}`;
    const label = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    opts.push({ label: `${label.charAt(0).toUpperCase()}${label.slice(1)}`, value });
  }
  return opts;
}

function monthToRange(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return { start: `${month}-01`, end: `${month}-${String(lastDay).padStart(2, '0')}` };
}

@Component({
  selector: 'app-bajas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, TableSkeleton, Pagination, Icon, FormsModule, BajaDialog],
  templateUrl: './bajas.html',
})
export class Bajas implements OnDestroy {
  private readonly service         = inject(BajaService);
  private readonly contractService = inject(ContractService);
  private readonly route           = inject(ActivatedRoute);
  private readonly listState       = inject(ListStateService);

  // ── Tabs ────────────────────────────────────────────────────────────────────
  protected readonly activeTab = signal<'list' | 'top'>('list');

  // ── List state ──────────────────────────────────────────────────────────────
  protected readonly loading       = signal(false);
  protected readonly result        = signal<Page<Contract> | null>(null);
  protected readonly page          = signal(0);
  protected readonly size          = signal(20);
  protected readonly rows          = computed(() => this.result()?.content ?? []);
  protected readonly totalElements = computed(() => this.result()?.totalElements ?? 0);
  protected readonly totalPages    = computed(() => this.result()?.totalPages ?? 0);
  protected readonly errorMessage  = signal<string | null>(null);

  // ── Filters ─────────────────────────────────────────────────────────────────
  protected searchQ            = '';
  protected selectedMonth      = '';
  protected selectedColaborador = '';
  protected selectedProducto   = '';
  protected startDate          = '';
  protected endDate            = '';
  protected readonly monthOptions = generateMonthOptions();
  private activeStartDate: string | undefined;
  private activeEndDate: string | undefined;
  private listSearchDebounce: ReturnType<typeof setTimeout> | null = null;

  // ── Top delegaciones ─────────────────────────────────────────────────────────
  protected readonly topDelegaciones = signal<DelegacionBajaStats[]>([]);
  protected readonly topLoading      = signal(false);
  protected readonly colaboradorOptions = computed(() =>
    this.topDelegaciones().map(d => d.delegacionNombre),
  );
  protected readonly filteredTop = computed(() => {
    const col = this.selectedColaborador;
    const top = this.topDelegaciones();
    return col ? top.filter(d => d.delegacionNombre === col) : top;
  });
  protected readonly totalBajasTop  = computed(() => this.filteredTop().reduce((s, d) => s + d.totalBajas, 0));
  protected readonly totalConsumoTop = computed(() => this.filteredTop().reduce((s, d) => s + (d.totalConsumo ?? 0), 0));

  // ── Baja dialog ──────────────────────────────────────────────────────────────
  protected readonly bajaDialogOpen  = signal(false);
  protected readonly bajaEditingRow  = signal<Contract | null>(null);
  protected readonly bajaPreselected = signal<Contract | null>(null);

  constructor() {
    const s = this.listState.get<{ searchQ: string; selectedMonth: string; selectedColaborador: string; selectedProducto: string; startDate: string; endDate: string; page: number; size: number }>('bajas');
    if (s) {
      this.searchQ = s.searchQ;
      this.selectedMonth = s.selectedMonth;
      this.selectedColaborador = s.selectedColaborador;
      this.selectedProducto = s.selectedProducto;
      this.startDate = s.startDate;
      this.endDate = s.endDate;
      if (s.selectedMonth) {
        const r = monthToRange(s.selectedMonth);
        this.activeStartDate = r.start;
        this.activeEndDate = r.end;
      }
      this.page.set(s.page);
      this.size.set(s.size);
      this.reload(s.page);
      this.loadTopDelegaciones();
    } else {
      this.applyFilters();
    }
    this.checkAutoOpen();
  }

  ngOnDestroy(): void {
    this.listState.save('bajas', {
      searchQ: this.searchQ, selectedMonth: this.selectedMonth,
      selectedColaborador: this.selectedColaborador, selectedProducto: this.selectedProducto,
      startDate: this.startDate, endDate: this.endDate, page: this.page(), size: this.size(),
    });
  }

  private checkAutoOpen(): void {
    const contratoId = this.route.snapshot.queryParamMap.get('contratoId');
    if (!contratoId) return;
    this.contractService.getById(contratoId).subscribe({
      next: (contract) => {
        this.bajaPreselected.set(contract);
        this.bajaDialogOpen.set(true);
      },
      error: () => {},
    });
  }

  protected openAddDialog(): void {
    this.bajaEditingRow.set(null);
    this.bajaPreselected.set(null);
    this.bajaDialogOpen.set(true);
  }

  protected openEdit(row: Contract): void {
    this.bajaPreselected.set(null);
    this.bajaEditingRow.set(row);
    this.bajaDialogOpen.set(true);
  }

  protected closeDialog(): void {
    this.bajaDialogOpen.set(false);
    this.bajaEditingRow.set(null);
    this.bajaPreselected.set(null);
  }

  protected onBajaSaved(): void {
    this.closeDialog();
    this.applyFilters();
  }

  // ── Filter logic ─────────────────────────────────────────────────────────────
  protected onMonthChange(month: string): void {
    this.selectedMonth = month;
    if (month) {
      const r = monthToRange(month);
      this.startDate = '';
      this.endDate   = '';
      this.activeStartDate = r.start;
      this.activeEndDate   = r.end;
    } else {
      this.activeStartDate = undefined;
      this.activeEndDate   = undefined;
    }
    this.applyFilters();
  }

  protected onDateChange(): void {
    this.selectedMonth = '';
    this.activeStartDate = this.startDate || undefined;
    this.activeEndDate   = this.endDate   || undefined;
    this.applyFilters();
  }

  protected onSearchChange(): void {
    if (this.listSearchDebounce) clearTimeout(this.listSearchDebounce);
    this.listSearchDebounce = setTimeout(() => this.reload(0), 350);
  }

  protected applyFilters(): void {
    this.reload(0);
    this.loadTopDelegaciones();
  }

  protected clearFilters(): void {
    this.searchQ           = '';
    this.selectedMonth     = '';
    this.selectedColaborador = '';
    this.selectedProducto  = '';
    this.startDate         = '';
    this.endDate           = '';
    this.activeStartDate   = undefined;
    this.activeEndDate     = undefined;
    this.applyFilters();
  }

  // ── List ─────────────────────────────────────────────────────────────────────
  protected onSizeChange(size: number): void {
    this.size.set(size);
    this.reload(0);
  }

  protected reload(p: number): void {
    this.page.set(p);
    this.loading.set(true);
    this.errorMessage.set(null);
    this.service.listBajas(
      { q: this.searchQ || undefined, startDate: this.activeStartDate, endDate: this.activeEndDate, idOferta: this.selectedProducto || undefined },
      p, this.size(),
    ).subscribe({
      next: (res) => { this.result.set(res); this.loading.set(false); },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set((err.error as { message?: string })?.message ?? err.message ?? 'Error al cargar las bajas');
      },
    });
  }

  private loadTopDelegaciones(): void {
    this.topLoading.set(true);
    this.service.topDelegaciones({ startDate: this.activeStartDate, endDate: this.activeEndDate })
      .subscribe({
        next: (list) => { this.topDelegaciones.set(list); this.topLoading.set(false); },
        error: () => this.topLoading.set(false),
      });
  }

  // ── CSV export ────────────────────────────────────────────────────────────────
  protected exportTopCsv(): void {
    const data   = this.filteredTop();
    const header = 'Posición,Colaborador,Total Bajas,Total Consumo';
    const rows   = data.map((d, i) =>
      `${i + 1},"${d.delegacionNombre}",${d.totalBajas},${(d.totalConsumo ?? 0).toFixed(2)}`
    );
    const blob = new Blob(['﻿' + [header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'top-bajas-colaboradores.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  // ── Display ──────────────────────────────────────────────────────────────────
  protected rankCardClass(i: number): string {
    if (i === 0) return 'bg-amber-50 border-amber-300 dark:bg-amber-950/20 dark:border-amber-700';
    if (i === 1) return 'bg-slate-50 border-slate-300 dark:bg-slate-800/20 dark:border-slate-500';
    if (i === 2) return 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-700';
    return 'bg-card border-border';
  }

  protected rankEmoji(i: number): string {
    return i === 0 ? '🏆' : i === 1 ? '🥈' : '🥉';
  }

  protected formatConsumo(v: number): string {
    return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  }

  protected date(v: string | null): string { return formatDate(v); }
  protected text(v: string | null): string { return safeText(v); }
}
