import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { FormDialog } from '../../../shared/components/form-dialog/form-dialog';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { TableSkeleton } from '../../../shared/components/table-skeleton/table-skeleton';
import { Icon } from '../../../shared/icons/icon';

import { TelkesAltaService } from '../../../core/services/telkes-alta.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  COMERCIALIZADORA_TELKES_VALUES,
  ESTADO_TELKES_ALTA_VALUES,
  Page,
  TelkesAlta,
  TelkesAltaPayload,
} from '../../../core/models';

@Component({
  selector: 'app-telkes-altas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, ReactiveFormsModule, RouterLink,
    PageHeader, FormDialog, ConfirmDialog, Pagination, TableSkeleton, Icon,
  ],
  templateUrl: './telkes-altas.html',
})
export class TelkesAltas {
  private readonly service = inject(TelkesAltaService);
  private readonly notify = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly result = signal<Page<TelkesAlta> | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly page = signal(0);
  protected readonly size = signal(20);
  protected q = '';
  protected estadoFilter = '';
  protected comercializadoraFilter = '';
  protected colaboradorFilter = '';

  protected readonly estadoValues = ESTADO_TELKES_ALTA_VALUES;
  protected readonly comercializadoraValues = COMERCIALIZADORA_TELKES_VALUES;

  protected readonly rows = computed(() => this.result()?.content ?? []);
  protected readonly total = computed(() => this.result()?.totalElements ?? 0);
  protected readonly totalPages = computed(() => this.result()?.totalPages ?? 0);

  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<TelkesAlta | null>(null);
  protected readonly submitting = signal(false);
  protected readonly confirmOpen = signal(false);
  protected readonly pendingDelete = signal<TelkesAlta | null>(null);
  protected readonly deleting = signal(false);

  protected readonly form = this.fb.group({
    titular: ['', Validators.required],
    cups: [''],
    nifCif: [''],
    direccionSuministro: [''],
    poblacion: [''],
    provincia: [''],
    telefono: [''],
    email: [''],
    cuentaBancaria: [''],
    comercializadora: [''],
    estado: ['Pendiente'],
    consumo: [null as number | null],
    fecha: [null as string | null],
    fechaFirma: [null as string | null],
    fechaRenovacion: [null as string | null],
    fechaActivacionContrato: [null as string | null],
    colaborador: [''],
    mesLiquidacion: [''],
    potenciaOriginal: [''],
    liquidado: [''],
    comentarios: [''],
  });

  constructor() { this.load(); }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.list(
      {
        q: this.q,
        estado: this.estadoFilter || undefined,
        comercializadora: this.comercializadoraFilter || undefined,
        colaborador: this.colaboradorFilter || undefined,
      },
      { page: this.page(), size: this.size(), sort: 'fecha,desc' },
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

  protected openCreate(): void {
    this.editing.set(null);
    this.form.reset({ estado: 'Pendiente' });
    this.dialogOpen.set(true);
  }

  protected openEdit(r: TelkesAlta): void {
    this.editing.set(r);
    this.form.reset({
      titular: r.titular ?? '', cups: r.cups ?? '', nifCif: r.nifCif ?? '',
      direccionSuministro: r.direccionSuministro ?? '', poblacion: r.poblacion ?? '',
      provincia: r.provincia ?? '', telefono: r.telefono ?? '', email: r.email ?? '',
      cuentaBancaria: r.cuentaBancaria ?? '', comercializadora: r.comercializadora ?? '',
      estado: r.estado ?? 'Pendiente', consumo: r.consumo, fecha: r.fecha,
      fechaFirma: r.fechaFirma, fechaRenovacion: r.fechaRenovacion,
      fechaActivacionContrato: r.fechaActivacionContrato,
      colaborador: r.colaborador ?? '', mesLiquidacion: r.mesLiquidacion ?? '',
      potenciaOriginal: r.potenciaOriginal ?? '', liquidado: r.liquidado ?? '',
      comentarios: r.comentarios ?? '',
    });
    this.dialogOpen.set(true);
  }

  protected closeDialog(): void { this.dialogOpen.set(false); }

  protected submit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    const payload = this.form.getRawValue() as TelkesAltaPayload;
    const r = this.editing();
    const obs = r ? this.service.update(r.id, payload) : this.service.create(payload);
    obs.subscribe({
      next: () => {
        this.submitting.set(false);
        this.notify.success(r ? 'Alta actualizada' : 'Alta creada');
        this.closeDialog();
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.notify.error(err.error?.message ?? 'Error al guardar');
      },
    });
  }

  protected askDelete(r: TelkesAlta): void {
    this.pendingDelete.set(r);
    this.confirmOpen.set(true);
  }

  protected cancelDelete(): void {
    this.confirmOpen.set(false);
    this.pendingDelete.set(null);
  }

  protected doDelete(): void {
    const r = this.pendingDelete();
    if (!r) return;
    this.deleting.set(true);
    this.service.delete(r.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.notify.success('Alta eliminada');
        this.cancelDelete();
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.deleting.set(false);
        this.notify.error(err.error?.message ?? 'Error');
      },
    });
  }

  protected fmtDate(v: string | null | undefined): string {
    if (!v) return '—';
    const d = new Date(v);
    return isNaN(d.getTime()) ? v : d.toLocaleDateString('es-ES');
  }

  protected fmtNumber(n: number | null | undefined): string {
    if (n == null) return '—';
    return new Intl.NumberFormat('es-ES').format(n);
  }
}
