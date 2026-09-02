import {
  ChangeDetectionStrategy, Component, computed,
  effect, inject, input, output, signal, untracked,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { FormDialog } from '../form-dialog/form-dialog';
import { Icon } from '../../icons/icon';
import { BajaService } from '../../../core/services/baja.service';
import { ContractService } from '../../../core/services/contract.service';
import { TarifaPenalizacionService } from '../../../core/services/tarifa-penalizacion.service';
import { NotificationService } from '../../../core/services/notification.service';
import { GlobalLoadingService } from '../../../core/services/global-loading.service';
import { Contract, TarifaPenalizacion, CalculoPenalizacionResponse } from '../../../core/models';

function extractMessage(err: HttpErrorResponse): string {
  return (err.error as { message?: string })?.message ?? err.message ?? 'Error inesperado';
}

@Component({
  selector: 'app-baja-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormDialog, Icon, FormsModule, ReactiveFormsModule],
  templateUrl: './baja-dialog.html',
})
export class BajaDialog {
  // ── Inputs ───────────────────────────────────────────────────────────────────
  open              = input<boolean>(false);
  editingBaja       = input<Contract | null>(null);
  preselectedContract = input<Contract | null>(null);

  // ── Outputs ──────────────────────────────────────────────────────────────────
  saved     = output<void>();
  cancelled = output<void>();

  // ── Services ─────────────────────────────────────────────────────────────────
  private readonly bajaService    = inject(BajaService);
  private readonly contractService = inject(ContractService);
  private readonly tarifaService  = inject(TarifaPenalizacionService);
  private readonly notify         = inject(NotificationService);
  private readonly globalLoading  = inject(GlobalLoadingService);
  private readonly fb             = inject(FormBuilder);

  // ── Form state ───────────────────────────────────────────────────────────────
  protected readonly submitting      = signal(false);
  protected readonly formError       = signal<string | null>(null);
  protected readonly showPenalizacion = signal(false);
  protected readonly confirming      = signal(false);

  // ── Tarifa / calculation ─────────────────────────────────────────────────────
  protected readonly tarifas    = signal<TarifaPenalizacion[]>([]);
  protected readonly calculo    = signal<CalculoPenalizacionResponse | null>(null);
  protected readonly calculando = signal(false);
  protected selectedTarifaId   = '';
  protected tienePrevioAviso   = false;
  /** Tarifa del contrato sin equivalente en tarifas de penalización (para avisar al usuario). */
  protected readonly tarifaSinMatch = signal<string | null>(null);
  private contractForAuto: Contract | null = null;
  private recalcTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Editable contract fields (signals for reactive empty-state styling) ──────
  protected readonly fechaInicioEdit = signal('');
  protected readonly consumoEdit     = signal('');
  protected readonly fechaBajaEmpty  = signal(false);

  // ── Contract search ──────────────────────────────────────────────────────────
  protected readonly selectedContract   = signal<{ id: string; label: string } | null>(null);
  protected readonly contractResults    = signal<Contract[]>([]);
  protected readonly contractDropdownOpen = signal(false);
  protected readonly contractSearching  = signal(false);
  protected contractSearchTerm          = '';
  private searchDebounce: ReturnType<typeof setTimeout> | null = null;

  // Computed: contract to show as a read-only chip (edit or preselect mode)
  protected readonly chipContract = computed(() => this.editingBaja() ?? this.preselectedContract());

  protected readonly form = this.fb.group({
    contratoId:       ['', Validators.required],
    feedbackCliente:  [''],
    tienePenalizacion: [false],
    montoLiquidacion: [null as number | null],
    fechaBaja:        [''],
  });

  constructor() {
    this.loadTarifas();
    effect(() => {
      const isOpen     = this.open();
      const editing    = this.editingBaja();
      const preselected = this.preselectedContract();
      if (isOpen) untracked(() => this.initForm(editing, preselected));
    });
  }

  private loadTarifas(): void {
    this.tarifaService.list(true).subscribe({
      next: (list) => {
        this.tarifas.set(list);
        this.autoSelectTarifa();
      },
      error: () => {},
    });
  }

  /** Selecciona automáticamente la tarifa de penalización que coincide con la tarifa del contrato. */
  private autoSelectTarifa(): void {
    this.tarifaSinMatch.set(null);
    if (this.selectedTarifaId || !this.contractForAuto || this.tarifas().length === 0) return;
    const c = this.contractForAuto;
    const ref = (c.suministroTarifa ?? '').trim().toUpperCase();
    if (!ref) return;
    const match = this.tarifas().find(t => {
      const nombre = t.nombre.trim().toUpperCase();
      return nombre.length > 0 && (ref === nombre || ref.startsWith(nombre));
    });
    if (match) {
      this.selectedTarifaId = match.id;
      this.scheduleRecalc();
    } else {
      this.tarifaSinMatch.set(c.suministroTarifa!.trim());
    }
  }

  private initForm(editing: Contract | null, preselected: Contract | null): void {
    this.calculo.set(null);
    this.confirming.set(false);
    this.formError.set(null);
    this.resetContractSearch();

    if (editing) {
      this.contractForAuto = editing;
      this.showPenalizacion.set(editing.tienePenalizacion ?? false);
      this.selectedTarifaId = editing.tarifaPenalizacionId ?? '';
      this.tienePrevioAviso = editing.tienePrevioAviso ?? false;
      this.fechaInicioEdit.set(editing.fechaInicio ?? '');
      this.consumoEdit.set(editing.consumoTotal != null ? String(editing.consumoTotal) : '');
      this.fechaBajaEmpty.set(!editing.fechaEstado);
      this.form.reset({
        contratoId:        editing.id,
        feedbackCliente:   editing.feedbackBaja ?? '',
        tienePenalizacion: editing.tienePenalizacion ?? false,
        montoLiquidacion:  editing.montoLiquidacion ?? null,
        fechaBaja:         editing.fechaEstado ?? '',
      });
    } else if (preselected) {
      this.contractForAuto = preselected;
      this.showPenalizacion.set(true);
      this.selectedTarifaId = preselected.tarifaPenalizacionId ?? '';
      this.tienePrevioAviso = false;
      this.fechaInicioEdit.set(preselected.fechaInicio ?? '');
      this.consumoEdit.set(preselected.consumoTotal != null ? String(preselected.consumoTotal) : '');
      this.fechaBajaEmpty.set(true);
      this.form.reset({
        contratoId:        preselected.id,
        tienePenalizacion: true,
        feedbackCliente:   '',
        montoLiquidacion:  null,
        fechaBaja:         '',
      });
    } else {
      this.contractForAuto = null;
      this.showPenalizacion.set(false);
      this.selectedTarifaId = '';
      this.tienePrevioAviso = false;
      this.fechaInicioEdit.set('');
      this.consumoEdit.set('');
      this.fechaBajaEmpty.set(false);
      this.form.reset({ tienePenalizacion: false });
    }

    this.autoSelectTarifa();
    this.scheduleRecalc();
  }

  protected onTienePenalizacionChange(checked: boolean): void {
    this.showPenalizacion.set(checked);
    if (!checked) {
      this.form.patchValue({ montoLiquidacion: null });
      this.calculo.set(null);
      this.selectedTarifaId = '';
    } else {
      this.autoSelectTarifa();
      this.scheduleRecalc();
    }
  }

  protected setPreaviso(conPreaviso: boolean): void {
    this.tienePrevioAviso = conPreaviso;
    this.scheduleRecalc();
  }

  /** Recalcula automáticamente la penalización (con debounce) al cambiar cualquier dato. */
  protected scheduleRecalc(): void {
    this.calculo.set(null);
    if (this.recalcTimer) clearTimeout(this.recalcTimer);
    this.recalcTimer = setTimeout(() => this.recalcular(), 350);
  }

  private recalcular(): void {
    if (!this.showPenalizacion() || !this.selectedTarifaId) return;

    const v           = this.form.getRawValue();
    const fechaInicio = this.fechaInicioEdit();
    const fechaBaja   = v.fechaBaja || new Date().toISOString().slice(0, 10);
    const consumo     = parseFloat(this.consumoEdit());

    // Datos incompletos: no se calcula todavía (sin mostrar errores)
    if (!fechaInicio || isNaN(consumo) || consumo < 0) return;

    this.calculando.set(true);
    this.tarifaService.calcular({
      tarifaId:         this.selectedTarifaId,
      fechaInicio,
      fechaBaja,
      tienePrevioAviso: this.tienePrevioAviso,
      consumo12m:       consumo,
    }).subscribe({
      next: (res) => {
        this.calculo.set(res);
        this.calculando.set(false);
        this.form.patchValue({ montoLiquidacion: res.totalSugerido });
      },
      error: () => {
        this.calculando.set(false);
        this.notify.error('Error al calcular la penalización');
      },
    });
  }

  protected requestConfirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (!this.form.get('contratoId')?.value) {
        this.formError.set('Selecciona un contrato');
      }
      return;
    }
    this.formError.set(null);
    if (this.editingBaja()) {
      this.submit();
    } else {
      this.confirming.set(true);
    }
  }

  protected cancelConfirm(): void {
    this.confirming.set(false);
  }

  protected submit(): void {
    const editing = this.editingBaja();
    const v = this.form.getRawValue();
    this.submitting.set(true);
    this.formError.set(null);
    this.confirming.set(false);

    if (editing) {
      this.globalLoading.start('Procesando', 'Guardando cambios…');
      this.bajaService.update(editing.id, {
        feedbackCliente:   v.feedbackCliente || null,
        tienePenalizacion: v.tienePenalizacion ?? false,
        montoLiquidacion:  v.montoLiquidacion ?? null,
        fechaBaja:         v.fechaBaja || null,
        tarifaId:          this.selectedTarifaId || null,
        tienePrevioAviso:  this.tienePrevioAviso,
      }).subscribe({
        next: () => {
          this.submitting.set(false);
          this.globalLoading.stop();
          this.notify.success('Baja actualizada correctamente');
          this.saved.emit();
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          this.globalLoading.stop();
          this.formError.set(extractMessage(err));
        },
      });
    } else {
      this.globalLoading.start('Procesando', 'Registrando baja…');
      this.bajaService.registrar({
        contratoId:        v.contratoId!,
        feedbackCliente:   v.feedbackCliente || null,
        tienePenalizacion: v.tienePenalizacion ?? false,
        montoLiquidacion:  v.montoLiquidacion ?? null,
        fechaBaja:         v.fechaBaja || null,
        tarifaId:          this.selectedTarifaId || null,
        tienePrevioAviso:  this.tienePrevioAviso,
      }).subscribe({
        next: () => {
          this.submitting.set(false);
          this.globalLoading.stop();
          this.notify.success('Baja registrada correctamente');
          this.saved.emit();
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          this.globalLoading.stop();
          this.formError.set(extractMessage(err));
        },
      });
    }
  }

  protected cancel(): void {
    this.cancelled.emit();
  }

  // ── Contract search ──────────────────────────────────────────────────────────
  protected onContractInput(term: string): void {
    this.contractSearchTerm = term;
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    if (!term.trim()) {
      this.contractResults.set([]);
      this.contractDropdownOpen.set(false);
      return;
    }
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
    this.fechaInicioEdit.set(c.fechaInicio ?? '');
    this.consumoEdit.set(c.consumoTotal != null ? String(c.consumoTotal) : '');
    this.contractForAuto = c;
    this.selectedTarifaId = c.tarifaPenalizacionId ?? '';
    this.autoSelectTarifa();
    this.scheduleRecalc();
  }

  protected clearContract(): void {
    this.resetContractSearch();
    this.fechaInicioEdit.set('');
    this.consumoEdit.set('');
    this.form.patchValue({ contratoId: '' });
  }

  private resetContractSearch(): void {
    this.selectedContract.set(null);
    this.contractSearchTerm = '';
    this.contractResults.set([]);
    this.contractDropdownOpen.set(false);
    if (this.searchDebounce) { clearTimeout(this.searchDebounce); this.searchDebounce = null; }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  protected getTarifaNombre(id: string): string {
    return this.tarifas().find(t => t.id === id)?.nombre ?? '—';
  }

  protected montoDisplay(v: number | null | undefined): string {
    return v != null ? Number(v).toFixed(2) : '—';
  }
}
