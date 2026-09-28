import { ChangeDetectionStrategy, Component, computed, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { FormDialog } from '../../../shared/components/form-dialog/form-dialog';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { TableSkeleton } from '../../../shared/components/table-skeleton/table-skeleton';
import { Icon } from '../../../shared/icons/icon';

import { VibraAltaService } from '../../../core/services/vibra-alta.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  COMERCIALIZADORA_VIBRA_VALUES,
  ESTADO_VIBRA_ALTA_VALUES,
  Page,
  VibraAlta,
  VibraAltaPayload,
} from '../../../core/models';

@Component({
  selector: 'app-vibra-altas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, ReactiveFormsModule, RouterLink,
    PageHeader, FormDialog, Pagination, TableSkeleton, Icon,
  ],
  templateUrl: './vibra-altas.html',
})
export class VibraAltas {
  private readonly service = inject(VibraAltaService);
  private readonly notify = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  protected readonly result = signal<Page<VibraAlta> | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly page = signal(0);
  protected readonly size = signal(20);

  protected q = '';
  protected estadoFilter = '';
  protected colaboradorFilter = '';
  protected comercializadoraFilter = '';

  protected readonly estadoValues = ESTADO_VIBRA_ALTA_VALUES;
  protected readonly comercializadoraValues = COMERCIALIZADORA_VIBRA_VALUES;

  protected readonly rows = computed(() => this.result()?.content ?? []);
  protected readonly total = computed(() => this.result()?.totalElements ?? 0);
  protected readonly totalPages = computed(() => this.result()?.totalPages ?? 0);

  // Dialog CRUD
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<VibraAlta | null>(null);
  protected readonly submitting = signal(false);

  // Dialog Rotacion Semestral
  protected readonly rotacionDialogOpen = signal(false);
  protected readonly rotacionElegibles = signal(0);
  protected readonly rotacionCutoff = signal('');
  protected readonly rotacionRunning = signal(false);
  protected nuevaComercializadora = '';

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

  protected changeEstado(r: VibraAlta, estado: string): void {
    this.service.cambiarEstado(r.id, { estado }).subscribe({
      next: () => { this.notify.success('Estado actualizado'); this.load(); },
      error: (err: HttpErrorResponse) => this.notify.error(err.error?.message ?? 'Error'),
    });
  }

  protected changeComercializadora(r: VibraAlta, comercializadora: string): void {
    const payload: VibraAltaPayload = { ...this.altaToPayload(r), comercializadora };
    this.service.update(r.id, payload).subscribe({
      next: () => { this.notify.success('Comercializadora actualizada'); this.load(); },
      error: (err: HttpErrorResponse) => this.notify.error(err.error?.message ?? 'Error'),
    });
  }

  private altaToPayload(a: VibraAlta): VibraAltaPayload {
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

  protected openEdit(r: VibraAlta): void {
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
      potenciaOriginal: r.potenciaOriginal ?? '', comentarios: r.comentarios ?? '',
    });
    this.dialogOpen.set(true);
  }

  protected closeDialog(): void { this.dialogOpen.set(false); }

  protected submit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    const payload = this.form.getRawValue() as VibraAltaPayload;
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

  protected confirmDelete(r: VibraAlta): void {
    if (!confirm(`Eliminar alta de ${r.titular}?`)) return;
    this.service.delete(r.id).subscribe({
      next: () => { this.notify.success('Alta eliminada'); this.load(); },
      error: (err: HttpErrorResponse) => this.notify.error(err.error?.message ?? 'Error'),
    });
  }

  // ── Rotacion Semestral ─────────────────────────────────
  protected openRotacion(): void {
    this.nuevaComercializadora = '';
    this.service.rotacionElegibles().subscribe({
      next: (r) => {
        this.rotacionElegibles.set(r.elegibles);
        this.rotacionCutoff.set(r.cutoff);
        this.rotacionDialogOpen.set(true);
      },
      error: (err: HttpErrorResponse) => this.notify.error(err.error?.message ?? 'Error'),
    });
  }

  protected closeRotacion(): void { this.rotacionDialogOpen.set(false); }

  protected ejecutarRotacion(): void {
    if (!this.nuevaComercializadora) return;
    this.rotacionRunning.set(true);
    this.service.rotacionSemestral({ comercializadora: this.nuevaComercializadora }).subscribe({
      next: (r) => {
        this.rotacionRunning.set(false);
        this.notify.success(`Rotación ejecutada: ${r.actualizados} contratos actualizados`);
        this.closeRotacion();
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.rotacionRunning.set(false);
        this.notify.error(err.error?.message ?? 'Error');
      },
    });
  }

  // ── Excel Export / Import ──────────────────────────────
  protected exportExcel(): void {
    this.service.exportExcel({
      q: this.q, estado: this.estadoFilter || undefined,
      colaborador: this.colaboradorFilter || undefined,
      comercializadora: this.comercializadoraFilter || undefined,
    }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'vibra-altas.xlsx';
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
      },
      error: () => this.notify.error('Error al descargar Excel'),
    });
  }

  protected triggerImportExcel(): void {
    this.fileInput.nativeElement.click();
  }

  protected onFileSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.service.importExcel(file).subscribe({
      next: (r) => {
        this.notify.success(`Importadas ${r.created} nuevas, ${r.updated} actualizadas, ${r.errors} errores`);
        this.load();
        input.value = '';
      },
      error: (err: HttpErrorResponse) => {
        this.notify.error(err.error?.message ?? 'Error al importar');
        input.value = '';
      },
    });
  }

  protected fmtDate(d: string | null): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es-ES');
  }
}
