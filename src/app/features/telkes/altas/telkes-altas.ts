import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { FormDialog } from '../../../shared/components/form-dialog/form-dialog';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
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
    PageHeader, FormDialog, ConfirmDialog, StatusBadge, Pagination, TableSkeleton, Icon,
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
  protected colaboradorFilter = '';
  protected comercializadoraFilter = '';
  protected fechaDesdeFilter = '';
  protected fechaHastaFilter = '';

  protected readonly sortField = signal<string>('fecha');
  protected readonly sortDir = signal<'asc' | 'desc'>('desc');

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

  protected readonly estadoValues = ESTADO_TELKES_ALTA_VALUES;
  protected readonly comercializadoraValues = COMERCIALIZADORA_TELKES_VALUES;

  protected readonly rows = computed(() => this.result()?.content ?? []);
  protected readonly total = computed(() => this.result()?.totalElements ?? 0);
  protected readonly totalPages = computed(() => this.result()?.totalPages ?? 0);

  // Dialog CRUD
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<TelkesAlta | null>(null);
  protected readonly submitting = signal(false);

  // Confirm delete
  protected readonly confirmOpen = signal(false);
  protected readonly pendingDelete = signal<TelkesAlta | null>(null);
  protected readonly deleting = signal(false);

  // Detail modal
  protected readonly detailOpen = signal(false);
  protected readonly detailData = signal<TelkesAlta | null>(null);
  protected readonly detailLoading = signal(false);

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
    fechaCambioComercializadora: [null as string | null],
    fechaRenovacion: [null as string | null],
    fechaActivacionContrato: [null as string | null],
    colaborador: [''],
    mesLiquidacion: [''],
    potenciaOriginal: [''],
    tramitado: [false],
    liquidado: [''],
    historialLiquidaciones: [''],
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
        colaborador: this.colaboradorFilter || undefined,
        comercializadora: this.comercializadoraFilter || undefined,
        fechaDesde: this.fechaDesdeFilter || undefined,
        fechaHasta: this.fechaHastaFilter || undefined,
      },
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

  protected changeEstado(r: TelkesAlta, estado: string): void {
    this.service.cambiarEstado(r.id, { estado }).subscribe({
      next: () => { this.notify.success('Estado actualizado'); this.load(); },
      error: (err: HttpErrorResponse) => this.notify.error(err.error?.message ?? 'Error'),
    });
  }

  protected changeComercializadora(r: TelkesAlta, comercializadora: string): void {
    const payload: TelkesAltaPayload = { ...this.altaToPayload(r), comercializadora };
    this.service.update(r.id, payload).subscribe({
      next: () => { this.notify.success('Comercializadora actualizada'); this.load(); },
      error: (err: HttpErrorResponse) => this.notify.error(err.error?.message ?? 'Error'),
    });
  }

  private altaToPayload(a: TelkesAlta): TelkesAltaPayload {
    return {
      titular: a.titular ?? '', cups: a.cups, nifCif: a.nifCif,
      direccionSuministro: a.direccionSuministro, poblacion: a.poblacion, provincia: a.provincia,
      telefono: a.telefono, email: a.email, cuentaBancaria: a.cuentaBancaria,
      comercializadora: a.comercializadora, estado: a.estado, consumo: a.consumo,
      fecha: a.fecha, fechaTramitacion: a.fechaTramitacion, fechaRenovacion: a.fechaRenovacion,
      fechaFirma: a.fechaFirma, fechaCambioComercializadora: a.fechaCambioComercializadora,
      fechaActivacionContrato: a.fechaActivacionContrato, colaborador: a.colaborador,
      mesLiquidacion: a.mesLiquidacion, potenciaOriginal: a.potenciaOriginal,
      potenciaP1: a.potenciaP1, potenciaP2: a.potenciaP2, potenciaP3: a.potenciaP3,
      potenciaP4: a.potenciaP4, potenciaP5: a.potenciaP5, potenciaP6: a.potenciaP6,
      tramitado: a.tramitado, liquidado: a.liquidado,
      liquidacionColaborador: a.liquidacionColaborador,
      historialLiquidaciones: a.historialLiquidaciones, comentarios: a.comentarios,
    };
  }

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
      fechaFirma: r.fechaFirma, fechaCambioComercializadora: r.fechaCambioComercializadora,
      fechaRenovacion: r.fechaRenovacion, fechaActivacionContrato: r.fechaActivacionContrato,
      colaborador: r.colaborador ?? '', mesLiquidacion: r.mesLiquidacion ?? '',
      potenciaOriginal: r.potenciaOriginal ?? '',
      tramitado: r.tramitado ?? false, liquidado: r.liquidado ?? '',
      historialLiquidaciones: r.historialLiquidaciones ?? '',
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

  protected verDetalle(id: string): void {
    this.detailOpen.set(true);
    this.detailLoading.set(true);
    this.detailData.set(null);
    this.service.getById(id).subscribe({
      next: (d) => { this.detailData.set(d); this.detailLoading.set(false); },
      error: (err: HttpErrorResponse) => {
        this.detailLoading.set(false);
        this.notify.error(err.error?.message ?? 'Error al cargar detalle');
        this.detailOpen.set(false);
      },
    });
  }

  protected closeDetail(): void {
    this.detailOpen.set(false);
    this.detailData.set(null);
  }

  protected fmtNumber(n: number | null | undefined): string {
    if (n == null) return '—';
    return new Intl.NumberFormat('es-ES').format(n);
  }

  protected fmtDate(d: string | null): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es-ES');
  }
}
