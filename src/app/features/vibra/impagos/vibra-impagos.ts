import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NgTemplateOutlet } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { ActionsMenu, ActionsMenuItem } from '../../../shared/components/actions-menu/actions-menu';
import { FormDialog } from '../../../shared/components/form-dialog/form-dialog';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { TableSkeleton } from '../../../shared/components/table-skeleton/table-skeleton';
import { Icon } from '../../../shared/icons/icon';
import { RowLink } from '../../../shared/directives/row-link';
import { VibraDevolucionesBanco } from './vibra-devoluciones-banco';

import { VibraImpagoService } from '../../../core/services/vibra-impago.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/auth';
import {
  ESTADO_FACTURA_VIBRA_LABEL,
  ESTADO_VIBRA_IMPAGO_LABEL,
  ESTADO_VIBRA_IMPAGO_VALUES,
  EstadoVibraImpago,
  Page,
  RESULTADO_GESTION_IMPAGO_LABEL,
  RESULTADOS_GESTION_IMPAGO,
  ResultadoGestionImpagoVibra,
  VibraImpago,
  VibraImpagoGestion,
  VibraImpagoPayload,
} from '../../../core/models';
import { formatDate, formatDateTime, formatEuro } from '../../../shared/utils/format';
import { mensajeError } from '../../../shared/utils/http-error';
import { CellTail } from '../../../shared/components/cell-tail/cell-tail';
import { ariaSort } from '../../../shared/utils/sort';
import { activoBajaTone, estadoImpagoCorto, estadoImpagoTone } from './vibra-impago-ui';

@Component({
  selector: 'app-vibra-impagos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, ReactiveFormsModule, RouterLink, NgTemplateOutlet,
    PageHeader, ActionsMenu, FormDialog, ConfirmDialog, Pagination, StatusBadge, TableSkeleton, Icon, VibraDevolucionesBanco, CellTail, RowLink,
  ],
  templateUrl: './vibra-impagos.html',
})
export class VibraImpagos {
  private readonly service = inject(VibraImpagoService);
  private readonly notify = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  /** Pestaña: lista de impagos o PDF del banco procesados. */
  protected readonly tab = signal<'impagos' | 'devoluciones'>('impagos');
  /** Diálogo de subida del PDF del banco (vive en la pestaña de devoluciones). */
  protected readonly subirDevoluciones = signal(false);
  protected readonly puedeSubirDevoluciones = computed(() => this.auth.hasRole('admin', 'contabilidad'));
  protected readonly puedeVerDevoluciones = computed(() => this.auth.hasRole('admin', 'contabilidad', 'operaciones'));

  protected readonly result = signal<Page<VibraImpago> | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly page = signal(0);
  protected readonly size = signal(20);
  protected q = '';
  protected estadoFilter = '';

  protected readonly estadoValues = ESTADO_VIBRA_IMPAGO_VALUES;
  protected readonly estadoLabel = ESTADO_VIBRA_IMPAGO_LABEL;
  protected readonly facturaLabel = ESTADO_FACTURA_VIBRA_LABEL;
  protected readonly resultados = RESULTADOS_GESTION_IMPAGO;
  protected readonly resultadoLabel = RESULTADO_GESTION_IMPAGO_LABEL;
  protected readonly fmtFecha = formatDate;
  protected readonly fmtFechaHora = formatDateTime;
  /** Estados, gestiones y avisos de cobro: como el backend. */
  protected readonly puedeCobrar = computed(() => this.auth.hasRole('admin', 'contabilidad', 'operaciones'));
  protected readonly puedeBorrar = computed(() => this.auth.hasRole('admin', 'contabilidad'));
  protected readonly fmtEur = formatEuro;
  protected readonly clientesDisponibles = signal<string[]>([]);
  protected readonly showClientesDropdown = signal(false);
  protected readonly clienteQuery = signal('');

  protected readonly filteredClientes = computed(() => {
    const query = this.clienteQuery().toLowerCase().trim();
    const all = this.clientesDisponibles();
    return query ? all.filter(c => c.toLowerCase().includes(query)) : all;
  });

  protected onClienteInput(ev: Event): void {
    this.clienteQuery.set((ev.target as HTMLInputElement).value);
  }

  protected onClienteBlur(): void {
    // delay para no perder el mousedown de las opciones
    setTimeout(() => this.showClientesDropdown.set(false), 150);
  }

  protected pickCliente(c: string): void {
    this.form.patchValue({ cliente: c });
    this.clienteQuery.set(c);
    this.showClientesDropdown.set(false);
  }

  protected readonly sortField = signal<string>('fechaDevolucion');
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

  protected ariaSort(field: string): 'ascending' | 'descending' | null {
    return ariaSort(this.sortField() === field, this.sortDir());
  }

  protected readonly rows = computed(() => this.result()?.content ?? []);

  /** Cabecera: acciones poco frecuentes. */
  protected readonly masAcciones: ActionsMenuItem[] = [
    { label: 'Exportar a Excel', icon: 'download', action: () => this.exportExcel() },
  ];

  /** Menús por fila: cambio de estado y acciones. */
  protected readonly menus = computed(() => {
    const cobrar = this.puedeCobrar();
    const borrar = this.puedeBorrar();
    const avisando = this.avisando();
    return new Map(this.rows().map((r) => {
      const estado: ActionsMenuItem[] = this.estadoValues.map((e) => ({
        label: this.estadoLabel[e], checked: r.estado === e, action: () => { if (r.estado !== e) this.changeEstado(r, e); },
      }));
      const acciones: ActionsMenuItem[] = [
        { label: 'Ver detalle', icon: 'eye', action: () => this.verDetalle(r.id) },
        { label: 'Editar', icon: 'edit', action: () => this.openEdit(r) },
      ];
      if (cobrar && r.estado !== 'PAGADO' && r.facturaId) {
        acciones.push({
          label: avisando === r.id ? 'Enviando aviso…' : 'Avisar por correo', icon: 'mail',
          disabled: avisando === r.id, action: () => this.avisar(r),
        });
      }
      if (borrar) {
        acciones.push({ label: 'Borrar', icon: 'trash', danger: true, separatorBefore: true, action: () => this.askDelete(r) });
      }
      return [r.id, { estado, acciones }] as const;
    }));
  });
  protected readonly total = computed(() => this.result()?.totalElements ?? 0);
  protected readonly totalPages = computed(() => this.result()?.totalPages ?? 0);

  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<VibraImpago | null>(null);
  protected readonly submitting = signal(false);

  // Confirm delete
  protected readonly confirmOpen = signal(false);
  protected readonly pendingDelete = signal<VibraImpago | null>(null);
  protected readonly deleting = signal(false);

  // Detail modal
  protected readonly detailOpen = signal(false);
  protected readonly detailData = signal<VibraImpago | null>(null);
  protected readonly detailLoading = signal(false);

  protected readonly form = this.fb.group({
    cliente: ['', Validators.required],
    factura: [''],
    importe: [null as number | null],
    fechaDevolucion: [null as string | null],
    motivoDevolucion: [''],
    activoBaja: ['Activo'],
    colaborador: [''],
    comentarios: [''],
  });

  constructor() {
    this.load();
    this.service.clientes().subscribe({
      next: (list) => this.clientesDisponibles.set(list),
      error: () => {},
    });
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.list(
      { q: this.q, estado: this.estadoFilter || undefined },
      { page: this.page(), size: this.size(), sort: `${this.sortField()},${this.sortDir()}` },
    ).subscribe({
      next: (r) => { this.result.set(r); this.loading.set(false); },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message ?? err.message ?? 'Error al cargar impagos');
        this.loading.set(false);
      },
    });
  }

  protected onPage(p: number): void { this.page.set(p); this.load(); }
  protected onPageSize(s: number): void { this.size.set(s); this.page.set(0); this.load(); }
  protected applyFilters(): void { this.page.set(0); this.load(); }
  protected limpiar(): void { this.q = ''; this.estadoFilter = ''; this.applyFilters(); }

  /** Pagado con factura ligada pide confirmación: paga también la factura. */
  protected readonly pendientePago = signal<VibraImpago | null>(null);

  protected changeEstado(r: VibraImpago, estado: EstadoVibraImpago): void {
    if (estado === r.estado) return;
    if (estado === 'PAGADO' && r.facturaId && r.facturaEstado !== 'PAGADA') {
      this.pendientePago.set(r);
      return;
    }
    this.guardarEstado(r, estado);
  }

  protected confirmarPago(): void {
    const r = this.pendientePago();
    if (!r) return;
    this.pendientePago.set(null);
    this.guardarEstado(r, 'PAGADO');
  }

  private guardarEstado(r: VibraImpago, estado: EstadoVibraImpago): void {
    this.service.cambiarEstado(r.id, { estado }).subscribe({
      next: () => {
        this.notify.success(estado === 'PAGADO' && r.facturaId ? 'Impago y factura marcados pagados' : 'Estado actualizado');
        this.load();
      },
      error: (err: HttpErrorResponse) => { this.notify.error(mensajeError(err, 'No se pudo cambiar el estado')); this.load(); },
    });
  }

  // ── Aviso por correo ─────────────────────────────────────────
  protected readonly avisando = signal<string | null>(null);

  protected avisar(r: VibraImpago): void {
    this.avisando.set(r.id);
    this.service.avisar(r.id).subscribe({
      next: (a) => {
        this.avisando.set(null);
        if (a.motivo === 'ENVIADO') this.notify.success('Cliente avisado por correo');
        else this.notify.warn(a.mensaje);
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.avisando.set(null);
        this.notify.error(mensajeError(err, 'No se pudo enviar el aviso'));
      },
    });
  }

  // ── Gestiones ────────────────────────────────────────────────
  protected readonly gestionImpago = signal<VibraImpago | null>(null);
  protected readonly gestionesLista = signal<VibraImpagoGestion[]>([]);
  protected readonly gestionesCargando = signal(false);
  protected readonly gestionGuardando = signal(false);
  protected readonly gestionForm = this.fb.group({
    resultado: ['' as ResultadoGestionImpagoVibra | '', Validators.required],
    nota: ['', Validators.maxLength(2000)],
    telefono: ['', Validators.maxLength(30)],
    volverLlamar: [null as string | null],
  });

  protected abrirGestion(r: VibraImpago): void {
    this.gestionImpago.set(r);
    this.gestionForm.reset({ resultado: '', nota: '', telefono: '', volverLlamar: null });
    this.gestionesLista.set([]);
    this.gestionesCargando.set(true);
    this.service.gestiones(r.id).subscribe({
      next: (g) => { this.gestionesLista.set(g); this.gestionesCargando.set(false); },
      error: (err: HttpErrorResponse) => {
        this.gestionesCargando.set(false);
        this.notify.error(mensajeError(err, 'No se pudieron cargar las gestiones'));
      },
    });
  }

  protected cerrarGestion(): void { this.gestionImpago.set(null); }

  protected guardarGestion(): void {
    const r = this.gestionImpago();
    if (!r || this.gestionForm.invalid) { this.gestionForm.markAllAsTouched(); return; }
    const v = this.gestionForm.getRawValue();
    this.gestionGuardando.set(true);
    this.service.addGestion(r.id, {
      resultado: v.resultado as ResultadoGestionImpagoVibra,
      nota: v.nota || null, telefono: v.telefono || null, volverLlamar: v.volverLlamar || null,
    }).subscribe({
      next: () => {
        this.gestionGuardando.set(false);
        this.notify.success('Gestión apuntada');
        this.cerrarGestion();
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.gestionGuardando.set(false);
        this.notify.error(mensajeError(err, 'No se pudo apuntar la gestión'));
      },
    });
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.form.reset({ activoBaja: 'Activo' });
    this.clienteQuery.set('');
    this.dialogOpen.set(true);
  }

  protected openEdit(r: VibraImpago): void {
    this.editing.set(r);
    this.form.reset({
      cliente: r.cliente ?? '', factura: r.factura ?? '', importe: r.importe,
      fechaDevolucion: r.fechaDevolucion,
      motivoDevolucion: r.motivoDevolucion ?? '', activoBaja: r.activoBaja ?? 'Activo',
      colaborador: r.colaborador ?? '', comentarios: r.comentarios ?? '',
    });
    this.clienteQuery.set(r.cliente ?? '');
    this.dialogOpen.set(true);
  }

  protected closeDialog(): void { this.dialogOpen.set(false); }

  protected submit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    const payload = this.form.getRawValue() as VibraImpagoPayload;
    const r = this.editing();
    const obs = r ? this.service.update(r.id, payload) : this.service.create(payload);
    obs.subscribe({
      next: () => {
        this.submitting.set(false);
        this.notify.success(r ? 'Impago actualizado' : 'Impago creado');
        this.closeDialog();
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.notify.error(err.error?.message ?? 'Error al guardar');
      },
    });
  }

  protected askDelete(r: VibraImpago): void {
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
        this.notify.success('Impago eliminado');
        this.cancelDelete();
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.deleting.set(false);
        this.notify.error(err.error?.message ?? 'Error');
      },
    });
  }

  protected exportExcel(): void {
    this.service.exportExcel({ q: this.q, estado: this.estadoFilter || undefined }).subscribe({
      next: (blob) => this.downloadBlob(blob, 'vibra-impagos.xlsx'),
      error: () => this.notify.error('Error al descargar Excel'),
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

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  protected readonly estadoTone = estadoImpagoTone;
  protected readonly estadoCorto = estadoImpagoCorto;
  protected readonly activoTone = activoBajaTone;

  /** Recargo por devolución y si ya va en una factura; null sin recargo. */
  protected recargoTexto(r: VibraImpago): string | null {
    if (!r.recargo) return null;
    return `${formatEuro(r.recargo)} · ${r.recargoFacturado ? 'en factura' : 'en la próxima factura'}`;
  }
}
