import { ChangeDetectionStrategy, Component, computed, inject, signal, ViewChild, ElementRef } from '@angular/core';
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

import { VibraAltaService } from '../../../core/services/vibra-alta.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/auth/auth.service';
import {
  COMERCIALIZADORA_PTE_TRAMITAR,
  COMERCIALIZADORA_VIBRA_VALUES,
  ESTADO_VIBRA_ALTA_LABEL,
  ESTADO_VIBRA_ALTA_VALUES,
  EstadoVibraAlta,
  Page,
  VibraAlta,
  VibraAltaFilter,
  VibraAltaPayload,
} from '../../../core/models';
import { fechaProximaDotClass } from '../../../shared/utils/format';

@Component({
  selector: 'app-vibra-altas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, ReactiveFormsModule, RouterLink,
    PageHeader, FormDialog, ConfirmDialog, StatusBadge, Pagination, TableSkeleton, Icon,
  ],
  templateUrl: './vibra-altas.html',
})
export class VibraAltas {
  private readonly service = inject(VibraAltaService);
  private readonly notify = inject(NotificationService);
  private readonly auth = inject(AuthService);
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
  protected tramitadoFilter: '' | 'si' | 'no' = '';
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

  protected readonly estadoValues = ESTADO_VIBRA_ALTA_VALUES;
  protected readonly comercializadoraValues = COMERCIALIZADORA_VIBRA_VALUES;
  protected readonly comercializadorasRotacion = COMERCIALIZADORA_VIBRA_VALUES.filter((c) => c !== COMERCIALIZADORA_PTE_TRAMITAR);

  protected readonly rows = computed(() => this.result()?.content ?? []);
  protected readonly total = computed(() => this.result()?.totalElements ?? 0);
  protected readonly totalPages = computed(() => this.result()?.totalPages ?? 0);

  // Dialog CRUD
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<VibraAlta | null>(null);
  protected readonly submitting = signal(false);

  // Confirm delete
  protected readonly confirmOpen = signal(false);
  protected readonly pendingDelete = signal<VibraAlta | null>(null);
  protected readonly deleting = signal(false);

  // Detail modal
  protected readonly detailOpen = signal(false);
  protected readonly detailData = signal<VibraAlta | null>(null);
  protected readonly detailLoading = signal(false);

  // Dialog Rotacion Semestral
  protected readonly rotacionDialogOpen = signal(false);
  protected readonly rotacionElegibles = signal(0);
  protected readonly rotacionCutoff = signal('');
  protected readonly rotacionRunning = signal(false);
  protected readonly kilowySyncing = signal(false);
  protected readonly puedeAdministrar = computed(() => this.auth.hasRole('admin', 'operaciones'));
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
    estado: ['PENDIENTE_FIRMA'],
    consumo: [null as number | null],
    fecha: [null as string | null],
    fechaFirma: [null as string | null],
    fechaCambioComercializadora: [null as string | null],
    fechaRenovacion: [null as string | null],
    fechaActivacionContrato: [null as string | null],
    fechaBaja: [null as string | null],
    colaborador: [''],
    mesLiquidacion: [''],
    potenciaOriginal: [''],
    tramitado: [false],
    liquidado: [''],
    comisionComercializadora: [null as number | null],
    historialLiquidaciones: [''],
    comentarios: [''],
  });

  constructor() { this.load(); }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.list(
      this.currentFilter(),
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
      // Recargar para que el desplegable vuelva al valor guardado
      error: (err: HttpErrorResponse) => { this.notify.error(err.error?.message ?? 'Error'); this.load(); },
    });
  }

  protected changeTramitado(r: VibraAlta, tramitado: boolean): void {
    this.service.marcarTramitado(r.id, { tramitado }).subscribe({
      next: () => { this.notify.success('Tramitado actualizado'); this.load(); },
      error: (err: HttpErrorResponse) => { this.notify.error(err.error?.message ?? 'Error'); this.load(); },
    });
  }

  /** Filtros activos; los usan el listado y el export Excel. */
  private currentFilter(): VibraAltaFilter {
    return {
      q: this.q,
      estado: this.estadoFilter || undefined,
      colaborador: this.colaboradorFilter || undefined,
      comercializadora: this.comercializadoraFilter || undefined,
      tramitado: this.tramitadoFilter === '' ? undefined : this.tramitadoFilter === 'si',
      fechaDesde: this.fechaDesdeFilter || undefined,
      fechaHasta: this.fechaHastaFilter || undefined,
    };
  }

  private altaToPayload(a: VibraAlta): VibraAltaPayload {
    return {
      titular: a.titular ?? '', cups: a.cups, nifCif: a.nifCif,
      direccionSuministro: a.direccionSuministro, poblacion: a.poblacion, provincia: a.provincia,
      telefono: a.telefono, email: a.email, cuentaBancaria: a.cuentaBancaria,
      comercializadora: a.comercializadora, estado: a.estado, consumo: a.consumo,
      fecha: a.fecha, fechaTramitacion: a.fechaTramitacion, fechaRenovacion: a.fechaRenovacion,
      fechaFirma: a.fechaFirma, fechaCambioComercializadora: a.fechaCambioComercializadora,
      fechaActivacionContrato: a.fechaActivacionContrato,
      fechaBaja: a.fechaBaja, colaborador: a.colaborador,
      mesLiquidacion: a.mesLiquidacion, potenciaOriginal: a.potenciaOriginal,
      potenciaP1: a.potenciaP1, potenciaP2: a.potenciaP2, potenciaP3: a.potenciaP3,
      potenciaP4: a.potenciaP4, potenciaP5: a.potenciaP5, potenciaP6: a.potenciaP6,
      tramitado: a.tramitado, liquidado: a.liquidado,
      liquidacionColaborador: a.liquidacionColaborador,
      comisionComercializadora: a.comisionComercializadora,
      historialLiquidaciones: a.historialLiquidaciones, comentarios: a.comentarios,
    };
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.form.reset({ estado: 'PENDIENTE_FIRMA' });
    this.dialogOpen.set(true);
  }

  protected openEdit(r: VibraAlta): void {
    this.editing.set(r);
    this.form.reset({
      titular: r.titular ?? '', cups: r.cups ?? '', nifCif: r.nifCif ?? '',
      direccionSuministro: r.direccionSuministro ?? '', poblacion: r.poblacion ?? '',
      provincia: r.provincia ?? '', telefono: r.telefono ?? '', email: r.email ?? '',
      cuentaBancaria: r.cuentaBancaria ?? '', comercializadora: r.comercializadora ?? '',
      estado: r.estado ?? 'PENDIENTE_FIRMA', consumo: r.consumo, fecha: r.fecha,
      fechaFirma: r.fechaFirma, fechaCambioComercializadora: r.fechaCambioComercializadora,
      fechaRenovacion: r.fechaRenovacion, fechaActivacionContrato: r.fechaActivacionContrato,
      fechaBaja: r.fechaBaja,
      colaborador: r.colaborador ?? '', mesLiquidacion: r.mesLiquidacion ?? '',
      potenciaOriginal: r.potenciaOriginal ?? '',
      tramitado: r.tramitado ?? false, liquidado: r.liquidado ?? '',
      comisionComercializadora: r.comisionComercializadora,
      historialLiquidaciones: r.historialLiquidaciones ?? '',
      comentarios: r.comentarios ?? '',
    });
    this.dialogOpen.set(true);
  }

  protected closeDialog(): void { this.dialogOpen.set(false); }

  protected submit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    const r = this.editing();
    // Base de la fila: conserva los campos que no están en el formulario
    const payload = { ...(r ? this.altaToPayload(r) : {}), ...this.form.getRawValue() } as VibraAltaPayload;
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

  protected askDelete(r: VibraAlta): void {
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
    this.service.exportExcel(this.currentFilter()).subscribe({
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

  protected syncKilowy(): void {
    this.kilowySyncing.set(true);
    this.service.syncKilowy().subscribe({
      next: (r) => {
        this.kilowySyncing.set(false);
        const msg = `Kilowy: ${r.creadas} nuevas, ${r.actualizadas} actualizadas`;
        if (r.errores > 0) this.notify.error(`${msg}, ${r.errores} errores`);
        else this.notify.success(msg);
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.kilowySyncing.set(false);
        this.notify.error(err.error?.message ?? 'Error al sincronizar con Kilowy');
      },
    });
  }

  protected estadoLabel(e: string | null): string {
    if (!e) return '—';
    return ESTADO_VIBRA_ALTA_LABEL[e as EstadoVibraAlta] ?? e;
  }

  protected fmtNumber(n: number | null | undefined): string {
    if (n == null) return '—';
    return new Intl.NumberFormat('es-ES').format(n);
  }

  protected readonly cambioDot = fechaProximaDotClass;

  /** YYYY-MM-DD → dd/mm/aaaa sin pasar por UTC (evita un día menos fuera de España). */
  protected fmtDate(d: string | null): string {
    if (!d) return '—';
    const [y, m, dd] = d.slice(0, 10).split('-');
    return `${dd}/${m}/${y}`;
  }
}
