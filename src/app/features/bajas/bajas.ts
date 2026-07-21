import {
  ChangeDetectionStrategy, Component, computed, inject, signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

import { PageHeader } from '../../shared/components/page-header/page-header';
import { TableSkeleton } from '../../shared/components/table-skeleton/table-skeleton';
import { Pagination } from '../../shared/components/pagination/pagination';
import { FormDialog } from '../../shared/components/form-dialog/form-dialog';
import { Icon } from '../../shared/icons/icon';
import { BajaService } from '../../core/services/baja.service';
import { ContractService } from '../../core/services/contract.service';
import { NotificationService } from '../../core/services/notification.service';
import { GlobalLoadingService } from '../../core/services/global-loading.service';
import { Contract, DelegacionBajaStats, Page } from '../../core/models';
import { formatDate, safeText } from '../../shared/utils/format';

function extractMessage(err: HttpErrorResponse): string {
  return (err.error as { message?: string })?.message ?? err.message ?? 'Error inesperado';
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
  imports: [
    PageHeader, TableSkeleton, Pagination, FormDialog,
    Icon, FormsModule, ReactiveFormsModule,
  ],
  templateUrl: './bajas.html',
})
export class Bajas {
  private readonly service = inject(BajaService);
  private readonly contractService = inject(ContractService);
  private readonly notify = inject(NotificationService);
  private readonly globalLoading = inject(GlobalLoadingService);
  private readonly fb = inject(FormBuilder);

  // ── Tabs ───────────────────────────────────────────────────────────────────
  protected readonly activeTab = signal<'list' | 'top'>('list');

  // ── List state ─────────────────────────────────────────────────────────────
  protected readonly loading = signal(false);
  protected readonly result = signal<Page<Contract> | null>(null);
  protected readonly page = signal(0);
  protected readonly size = signal(20);

  protected readonly rows = computed(() => this.result()?.content ?? []);
  protected readonly totalElements = computed(() => this.result()?.totalElements ?? 0);
  protected readonly totalPages = computed(() => this.result()?.totalPages ?? 0);

  // ── Filters ────────────────────────────────────────────────────────────────
  protected readonly errorMessage = signal<string | null>(null);
  protected searchQ = '';
  protected selectedMonth = '';
  protected selectedColaborador = '';
  protected selectedProducto = '';
  protected startDate = '';
  protected endDate = '';

  protected readonly monthOptions = generateMonthOptions();

  private activeStartDate: string | undefined;
  private activeEndDate: string | undefined;

  // ── Top delegaciones ────────────────────────────────────────────────────────
  protected readonly topDelegaciones = signal<DelegacionBajaStats[]>([]);
  protected readonly topLoading = signal(false);

  protected readonly colaboradorOptions = computed(() =>
    this.topDelegaciones().map(d => d.delegacionNombre),
  );

  protected readonly filteredTop = computed(() => {
    const col = this.selectedColaborador;
    const top = this.topDelegaciones();
    return col ? top.filter(d => d.delegacionNombre === col) : top;
  });

  protected readonly totalBajasTop = computed(() =>
    this.filteredTop().reduce((s, d) => s + d.totalBajas, 0),
  );

  protected readonly totalConsumoTop = computed(() =>
    this.filteredTop().reduce((s, d) => s + (d.totalConsumo ?? 0), 0),
  );

  // ── Dialog ─────────────────────────────────────────────────────────────────
  protected readonly dialogOpen = signal(false);
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly editingRow = signal<Contract | null>(null);

  // ── Contract search ─────────────────────────────────────────────────────────
  protected readonly selectedContract = signal<{ id: string; label: string } | null>(null);
  protected readonly contractResults = signal<Contract[]>([]);
  protected readonly contractSearching = signal(false);
  protected readonly contractDropdownOpen = signal(false);
  protected contractSearchTerm = '';
  private listSearchDebounce: ReturnType<typeof setTimeout> | null = null;
  private searchDebounce: ReturnType<typeof setTimeout> | null = null;

  protected readonly showPenalizacion = signal(false);

  protected readonly form = this.fb.group({
    contratoId: ['', Validators.required],
    feedbackCliente: [''],
    tienePenalizacion: [false],
    montoLiquidacion: [null as number | null],
    fechaBaja: [''],
  });

  constructor() { this.applyFilters(); }

  // ── Filter logic ─────────────────────────────────────────────────────────
  protected onMonthChange(month: string): void {
    this.selectedMonth = month;
    if (month) {
      const r = monthToRange(month);
      this.startDate = '';
      this.endDate = '';
      this.activeStartDate = r.start;
      this.activeEndDate = r.end;
    } else {
      this.activeStartDate = undefined;
      this.activeEndDate = undefined;
    }
    this.applyFilters();
  }

  protected onDateChange(): void {
    this.selectedMonth = '';
    this.activeStartDate = this.startDate || undefined;
    this.activeEndDate = this.endDate || undefined;
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
    this.searchQ = '';
    this.selectedMonth = '';
    this.selectedColaborador = '';
    this.selectedProducto = '';
    this.startDate = '';
    this.endDate = '';
    this.activeStartDate = undefined;
    this.activeEndDate = undefined;
    this.applyFilters();
  }

  // ── List ────────────────────────────────────────────────────────────────────
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

  // ── Dialog ──────────────────────────────────────────────────────────────────
  protected openDialog(): void {
    this.editingRow.set(null);
    this.formError.set(null);
    this.showPenalizacion.set(false);
    this.resetContractSearch();
    this.form.reset({ tienePenalizacion: false });
    this.dialogOpen.set(true);
  }

  protected openEdit(row: Contract): void {
    this.editingRow.set(row);
    this.formError.set(null);
    this.showPenalizacion.set(row.tienePenalizacion ?? false);
    this.resetContractSearch();
    this.form.reset({
      contratoId: row.id,
      feedbackCliente: row.feedbackBaja ?? '',
      tienePenalizacion: row.tienePenalizacion ?? false,
      montoLiquidacion: row.montoLiquidacion ?? null,
      fechaBaja: row.fechaEstado ?? '',
    });
    this.dialogOpen.set(true);
  }

  protected closeDialog(): void {
    this.dialogOpen.set(false);
    this.editingRow.set(null);
    this.resetContractSearch();
  }

  protected onTienePenalizacionChange(checked: boolean): void {
    this.showPenalizacion.set(checked);
    if (!checked) this.form.patchValue({ montoLiquidacion: null });
  }

  protected submit(): void {
    const editing = this.editingRow();
    if (!editing && (this.form.invalid || !this.selectedContract())) {
      this.form.markAllAsTouched();
      if (!this.selectedContract()) this.formError.set('Selecciona un contrato');
      return;
    }
    const v = this.form.getRawValue();
    this.submitting.set(true);
    this.formError.set(null);

    if (editing) {
      this.globalLoading.start('Procesando', 'Guardando cambios…');
      this.service.update(editing.id, {
        feedbackCliente: v.feedbackCliente || null,
        tienePenalizacion: v.tienePenalizacion ?? false,
        montoLiquidacion: v.montoLiquidacion ?? null,
        fechaBaja: v.fechaBaja || null,
      }).subscribe({
        next: () => {
          this.submitting.set(false);
          this.globalLoading.stop();
          this.closeDialog();
          this.notify.success('Baja actualizada correctamente');
          this.applyFilters();
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          this.globalLoading.stop();
          this.formError.set(extractMessage(err));
        },
      });
    } else {
      this.globalLoading.start('Procesando', 'Registrando baja…');
      this.service.registrar({
        contratoId: v.contratoId!,
        feedbackCliente: v.feedbackCliente || null,
        tienePenalizacion: v.tienePenalizacion ?? false,
        montoLiquidacion: v.montoLiquidacion ?? null,
        fechaBaja: v.fechaBaja || null,
      }).subscribe({
        next: () => {
          this.submitting.set(false);
          this.globalLoading.stop();
          this.closeDialog();
          this.notify.success('Baja registrada correctamente');
          this.applyFilters();
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          this.globalLoading.stop();
          this.formError.set(extractMessage(err));
        },
      });
    }
  }

  // ── Contract search ─────────────────────────────────────────────────────────
  protected onContractInput(term: string): void {
    this.contractSearchTerm = term;
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    if (!term.trim()) { this.contractResults.set([]); this.contractDropdownOpen.set(false); return; }
    this.searchDebounce = setTimeout(() => {
      this.contractSearching.set(true);
      this.contractService.list({ q: term }, { page: 0, size: 8 }).subscribe({
        next: (p) => {
          const eligible = p.content.filter(c => (c.estado as string) !== 'baja');
          this.contractResults.set(eligible);
          this.contractDropdownOpen.set(eligible.length > 0);
          this.contractSearching.set(false);
        },
        error: () => this.contractSearching.set(false),
      });
    }, 300);
  }

  protected selectContract(c: Contract): void {
    const label = [c.idExterno, c.cups].filter(Boolean).join(' · ');
    this.selectedContract.set({ id: c.id, label });
    this.contractSearchTerm = label;
    this.contractDropdownOpen.set(false);
    this.contractResults.set([]);
    this.form.patchValue({ contratoId: c.id });
  }

  protected clearContract(): void {
    this.resetContractSearch();
    this.form.patchValue({ contratoId: '' });
  }

  private resetContractSearch(): void {
    this.selectedContract.set(null);
    this.contractSearchTerm = '';
    this.contractResults.set([]);
    this.contractDropdownOpen.set(false);
    if (this.searchDebounce) { clearTimeout(this.searchDebounce); this.searchDebounce = null; }
  }

  // ── CSV export ─────────────────────────────────────────────────────────────
  protected exportTopCsv(): void {
    const data = this.filteredTop();
    const header = 'Posición,Colaborador,Total Bajas,Total Consumo';
    const rows = data.map((d, i) =>
      `${i + 1},"${d.delegacionNombre}",${d.totalBajas},${(d.totalConsumo ?? 0).toFixed(2)}`
    );
    const blob = new Blob(['﻿' + [header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'top-bajas-colaboradores.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  // ── Display ─────────────────────────────────────────────────────────────────
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
