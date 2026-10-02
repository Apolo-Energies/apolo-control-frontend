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
import { BajaStats, Contract, DelegacionBajaStats, Page } from '../../core/models';
import { formatDate, safeText, tarifaBadgeClass } from '../../shared/utils/format';
import { IconName } from '../../shared/icons/icon';

type SortDir = 'asc' | 'desc';
type SortCol = 'clienteNombre' | 'clienteDelegacion' | 'idOferta' | 'suministroTarifa'
             | 'fechaEstado' | 'fechaFinPrevista' | 'consumoTotal' | 'daysDiff';
type ResRange = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function toIsoWeek(d: Date): string {
  const t = new Date(d); t.setDate(t.getDate() + 4 - (t.getDay() || 7));
  const y = t.getFullYear();
  const jan1 = new Date(y, 0, 1);
  return `${y}-W${String(Math.ceil(((t.getTime()-jan1.getTime())/86400000+jan1.getDay()+1)/7)).padStart(2,'0')}`;
}
function toIsoMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function weekBounds(isoWeek: string): { start: Date; end: Date } {
  const [yearStr, wStr] = isoWeek.split('-W');
  const year = +yearStr, week = +wStr;
  const jan4 = new Date(year, 0, 4);
  const dow = jan4.getDay() || 7;
  const mon = new Date(jan4); mon.setDate(jan4.getDate() - dow + 1 + (week-1)*7);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return { start: mon, end: sun };
}
function fmtDayMonth(d: Date): string {
  return `${d.getDate()} ${['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][d.getMonth()]}`;
}

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
  protected readonly activeTab = signal<'list' | 'top' | 'resumen'>('list');

  // ── Resumen tab ──────────────────────────────────────────────────────────────
  protected readonly resRange        = signal<ResRange>('month');
  protected readonly resStats        = signal<BajaStats | null>(null);
  protected readonly resLoading      = signal(false);
  protected readonly resError        = signal<string | null>(null);
  protected readonly resSelectedWeek  = signal(toIsoWeek(new Date()));
  protected readonly resSelectedMonth = signal(toIsoMonth(new Date()));
  protected readonly resSelectedYear  = signal(new Date().getFullYear());
  protected readonly resCustomStart   = signal('');
  protected readonly resCustomEnd     = signal('');
  protected readonly resAvailableYears = Array.from(
    { length: new Date().getFullYear() - 2020 + 1 }, (_, i) => new Date().getFullYear() - i,
  );
  protected readonly resWeekLabel = computed(() => {
    const { start, end } = weekBounds(this.resSelectedWeek());
    return `${fmtDayMonth(start)} – ${fmtDayMonth(end)} ${start.getFullYear()}`;
  });
  protected readonly resRanges: { id: ResRange; label: string }[] = [
    { id: 'today',  label: 'Hoy' },
    { id: 'week',   label: 'Semana' },
    { id: 'month',  label: 'Mes' },
    { id: 'year',   label: 'Año' },
    { id: 'all',    label: 'Histórico' },
    { id: 'custom', label: 'Personalizado' },
  ];

  // ── List state ──────────────────────────────────────────────────────────────
  protected readonly loading       = signal(false);
  protected readonly result        = signal<Page<Contract> | null>(null);
  protected readonly page          = signal(0);
  protected readonly size          = signal(20);
  protected readonly rows          = computed(() => this.result()?.content ?? []);
  protected readonly totalElements = computed(() => this.result()?.totalElements ?? 0);
  protected readonly totalPages    = computed(() => this.result()?.totalPages ?? 0);
  protected readonly errorMessage  = signal<string | null>(null);

  // ── Sort ─────────────────────────────────────────────────────────────────────
  protected readonly sortCol = signal<SortCol | null>(null);
  protected readonly sortDir = signal<SortDir>('asc');
  protected readonly sortedRows = computed(() => {
    const col = this.sortCol();
    const data = this.rows();
    if (!col) return data;
    const dir = this.sortDir() === 'asc' ? 1 : -1;
    return [...data].sort((a, b) => {
      let va: string | number | null;
      let vb: string | number | null;
      if (col === 'daysDiff') {
        va = this.daysDiff(a);
        vb = this.daysDiff(b);
      } else {
        va = (a[col] ?? null) as string | number | null;
        vb = (b[col] ?? null) as string | number | null;
      }
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb), 'es', { numeric: true }) * dir;
    });
  });

  // ── Filters ─────────────────────────────────────────────────────────────────
  protected searchQ            = '';
  protected selectedMonth      = '';
  protected selectedColaborador = '';
  protected selectedProducto   = '';
  protected startDate          = '';
  protected endDate            = '';
  protected filterPenalizacion: boolean | null = null;
  protected filterMinDiasDif: number | null = null;
  protected filterAntesFinPrevista: boolean | null = null;
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
    const s = this.listState.get<{ searchQ: string; selectedMonth: string; selectedColaborador: string; selectedProducto: string; startDate: string; endDate: string; filterPenalizacion: boolean | null; filterMinDiasDif: number | null; filterAntesFinPrevista: boolean | null; page: number; size: number }>('bajas');
    if (s) {
      this.searchQ = s.searchQ;
      this.selectedMonth = s.selectedMonth;
      this.selectedColaborador = s.selectedColaborador;
      this.selectedProducto = s.selectedProducto;
      this.startDate = s.startDate;
      this.endDate = s.endDate;
      this.filterPenalizacion = s.filterPenalizacion ?? null;
      this.filterMinDiasDif = s.filterMinDiasDif ?? null;
      this.filterAntesFinPrevista = s.filterAntesFinPrevista ?? null;
      if (s.selectedMonth) {
        const r = monthToRange(s.selectedMonth);
        this.activeStartDate = r.start;
        this.activeEndDate = r.end;
      } else {
        this.activeStartDate = s.startDate || undefined;
        this.activeEndDate = s.endDate || undefined;
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
      startDate: this.startDate, endDate: this.endDate,
      filterPenalizacion: this.filterPenalizacion, filterMinDiasDif: this.filterMinDiasDif, filterAntesFinPrevista: this.filterAntesFinPrevista, page: this.page(), size: this.size(),
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
    this.searchQ                = '';
    this.selectedMonth          = '';
    this.selectedColaborador    = '';
    this.selectedProducto       = '';
    this.startDate              = '';
    this.endDate                = '';
    this.filterPenalizacion     = null;
    this.filterMinDiasDif       = null;
    this.filterAntesFinPrevista = null;
    this.activeStartDate        = undefined;
    this.activeEndDate          = undefined;
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
      {
        q: this.searchQ || undefined,
        startDate: this.activeStartDate,
        endDate: this.activeEndDate,
        idOferta: this.selectedProducto || undefined,
        conPenalizacion: this.filterPenalizacion ?? undefined,
        minDiasDif: this.filterMinDiasDif ?? undefined,
        antesFinPrevista: this.filterAntesFinPrevista ?? undefined,
      },
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

  // ── Resumen ──────────────────────────────────────────────────────────────────
  protected setActiveTab(tab: 'list' | 'top' | 'resumen'): void {
    this.activeTab.set(tab);
    if (tab === 'resumen') this.loadResStats();
  }

  protected setResRange(id: ResRange): void {
    if (this.resRange() === id) return;
    this.resRange.set(id);
    const now = new Date();
    if (id === 'week')  this.resSelectedWeek.set(toIsoWeek(now));
    if (id === 'month') this.resSelectedMonth.set(toIsoMonth(now));
    if (id === 'year')  this.resSelectedYear.set(now.getFullYear());
    if (id !== 'custom') this.loadResStats();
  }

  protected onResWeekChange(e: Event): void {
    this.resSelectedWeek.set((e.target as HTMLInputElement).value);
    this.loadResStats();
  }

  protected onResMonthChange(e: Event): void {
    this.resSelectedMonth.set((e.target as HTMLInputElement).value);
    this.loadResStats();
  }

  protected onResYearChange(e: Event): void {
    this.resSelectedYear.set(+(e.target as HTMLSelectElement).value);
    this.loadResStats();
  }

  protected onResCustomChange(): void {
    if (this.resCustomStart() && this.resCustomEnd()) this.loadResStats();
  }

  private buildResFilter(): { startDate?: string; endDate?: string } {
    const r = this.resRange();
    if (r === 'all') return {};
    const today = new Date();
    switch (r) {
      case 'today': { const d = toIsoDate(today); return { startDate: d, endDate: d }; }
      case 'week': {
        const w = this.resSelectedWeek();
        if (!w || !/^\d{4}-W\d{2}$/.test(w)) return {};
        const { start, end } = weekBounds(w);
        return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
      }
      case 'month': {
        const m = this.resSelectedMonth();
        if (!m || !/^\d{4}-\d{2}$/.test(m)) return {};
        const [y, mo] = m.split('-').map(Number);
        return { startDate: `${m}-01`, endDate: toIsoDate(new Date(y, mo, 0)) };
      }
      case 'year': { const y = this.resSelectedYear(); return { startDate: `${y}-01-01`, endDate: `${y}-12-31` }; }
      case 'custom': {
        const s = this.resCustomStart(), e = this.resCustomEnd();
        return s && e ? { startDate: s, endDate: e } : {};
      }
    }
  }

  private loadResStats(): void {
    this.resLoading.set(true);
    this.resError.set(null);
    this.service.stats(this.buildResFilter()).subscribe({
      next: s => { this.resStats.set(s); this.resLoading.set(false); },
      error: (err: { status?: number; message?: string }) => {
        this.resLoading.set(false);
        this.resError.set(err.status === 404
          ? 'Endpoint no encontrado — reinicia el servidor backend.'
          : ((err as { error?: { message?: string } }).error?.message ?? 'Error al cargar estadísticas'));
      },
    });
  }

  protected formatConsumoStats(gwh: number): string {
    return `${gwh.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GWh`;
  }

  protected formatEurStats(v: number): string {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(v);
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
  protected readonly tarifaBadge = tarifaBadgeClass;

  protected setSort(col: SortCol): void {
    if (this.sortCol() === col) {
      this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortCol.set(col);
      this.sortDir.set('asc');
    }
  }

  protected sortIcon(col: SortCol): IconName {
    if (this.sortCol() !== col) return 'arrow-down';
    return this.sortDir() === 'asc' ? 'arrow-up' : 'arrow-down';
  }

  protected sortIconClass(col: SortCol): string {
    return this.sortCol() === col ? 'text-primary' : 'opacity-25';
  }

  protected daysDiff(row: Contract): number | null {
    if (!row.fechaEstado || !row.fechaFinPrevista) return null;
    const a = new Date(row.fechaEstado).getTime();
    const b = new Date(row.fechaFinPrevista).getTime();
    return Math.round((b - a) / (1000 * 60 * 60 * 24));
  }

  protected downloadCsv(): void {
    this.service.exportCsv({
      q: this.searchQ || undefined,
      startDate: this.startDate || undefined,
      endDate: this.endDate || undefined,
      conPenalizacion: this.filterPenalizacion ?? undefined,
      minDiasDif: this.filterMinDiasDif ?? undefined,
      antesFinPrevista: this.filterAntesFinPrevista ?? undefined,
    }).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'bajas.csv'; a.click();
      URL.revokeObjectURL(url);
    });
  }
}
