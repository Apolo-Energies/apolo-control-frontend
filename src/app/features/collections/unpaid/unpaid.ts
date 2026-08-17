import {
  ChangeDetectionStrategy, Component, computed, inject, signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { TableSkeleton } from '../../../shared/components/table-skeleton/table-skeleton';
import { StatusBadge, StatusTone } from '../../../shared/components/status-badge/status-badge';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { FormDialog } from '../../../shared/components/form-dialog/form-dialog';
import { KpiCard } from '../../../shared/components/kpi-card/kpi-card';
import { Icon } from '../../../shared/icons/icon';

import { GestionImpagoService } from '../../../core/services/gestion-impago.service';
import { NotificationService } from '../../../core/services/notification.service';
import { GlobalLoadingService } from '../../../core/services/global-loading.service';
import {
  GestionImpago, GestionImpagoPayload, GestionImpagoFilter,
  EstadoGestionImpago, PrioridadGestionImpago,
  ESTADO_GESTION_IMPAGO_VALUES, ESTADO_GESTION_IMPAGO_LABEL,
  PRIORIDAD_GESTION_IMPAGO_LABEL, Page,
} from '../../../core/models';

function extractMessage(err: HttpErrorResponse): string {
  return (err.error as { message?: string })?.message ?? err.message ?? 'Error inesperado';
}

function estadoToneFn(estado: EstadoGestionImpago): StatusTone {
  switch (estado) {
    case 'pagado':          return 'success';
    case 'va_a_pagar':      return 'info';
    case 'acuerdo_pago':    return 'info';
    case 'aviso_corte':     return 'warning';
    case 'cortado':         return 'danger';
    case 'ovc':             return 'purple';
    case 'demanda':         return 'danger';
    case 'nuevo':           return 'neutral';
    default:                return 'neutral';
  }
}

function prioridadToneFn(prioridad: PrioridadGestionImpago): StatusTone {
  switch (prioridad) {
    case 'urgente': return 'danger';
    case 'alta':    return 'warning';
    case 'media':   return 'info';
    default:        return 'neutral';
  }
}

@Component({
  selector: 'app-unpaid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeader, TableSkeleton, StatusBadge, Pagination, FormDialog,
    KpiCard, Icon, FormsModule, ReactiveFormsModule, RouterLink,
  ],
  templateUrl: './unpaid.html',
})
export class Unpaid {
  private readonly service       = inject(GestionImpagoService);
  private readonly notify        = inject(NotificationService);
  private readonly globalLoading = inject(GlobalLoadingService);
  private readonly fb            = inject(FormBuilder);

  // ── List state ────────────────────────────────────────────────────────────
  protected readonly loading       = signal(false);
  protected readonly result        = signal<Page<GestionImpago> | null>(null);
  protected readonly error         = signal<string | null>(null);
  protected readonly page          = signal(0);
  protected readonly size          = signal(20);

  // ── Filters ───────────────────────────────────────────────────────────────
  protected q             = '';
  protected estadoFilter: EstadoGestionImpago | '' = '';

  // ── Constants ─────────────────────────────────────────────────────────────
  protected readonly estadoValues    = ESTADO_GESTION_IMPAGO_VALUES;
  protected readonly estadoLabel     = ESTADO_GESTION_IMPAGO_LABEL;
  protected readonly prioridadLabel  = PRIORIDAD_GESTION_IMPAGO_LABEL;
  protected readonly prioridadValues: PrioridadGestionImpago[] = ['baja', 'media', 'alta', 'urgente'];

  protected readonly rows          = computed(() => this.result()?.content ?? []);
  protected readonly totalElements = computed(() => this.result()?.totalElements ?? 0);
  protected readonly totalPages    = computed(() => this.result()?.totalPages ?? 0);

  // ── Dialog state ──────────────────────────────────────────────────────────
  protected readonly dialogOpen  = signal(false);
  protected readonly editing     = signal<GestionImpago | null>(null);
  protected readonly submitting  = signal(false);
  protected readonly formError   = signal<string | null>(null);

  protected readonly form = this.fb.group({
    clienteId:        ['', Validators.required],
    numeroFactura:    [''],
    importe:          [0],
    fechaVencimiento: [''],
    fechaDevolucion:  [''],
    estado:           ['nuevo'],
    prioridad:        ['media'],
    colaborador:      [''],
    motivoDevolucion: [''],
    observaciones:    [''],
  });

  constructor() { this.reload(0); }

  // ── List ──────────────────────────────────────────────────────────────────
  protected reload(p: number): void {
    this.page.set(p);
    this.loading.set(true);
    const filter: GestionImpagoFilter = {
      q:      this.q || undefined,
      estado: this.estadoFilter || undefined,
    };
    this.service.list(filter, { page: p, size: this.size() }).subscribe({
      next:  (res) => { this.result.set(res); this.loading.set(false); },
      error: (err: HttpErrorResponse) => { this.error.set(extractMessage(err)); this.loading.set(false); },
    });
  }

  protected onSizeChange(size: number): void { this.size.set(size); this.reload(0); }
  protected applyFilters(): void { this.reload(0); }
  protected clearFilters(): void { this.q = ''; this.estadoFilter = ''; this.reload(0); }

  // ── Create / Edit ─────────────────────────────────────────────────────────
  protected openCreate(): void {
    this.editing.set(null);
    this.formError.set(null);
    this.form.reset({ estado: 'nuevo', prioridad: 'media', importe: 0 });
    this.dialogOpen.set(true);
  }

  protected openEdit(r: GestionImpago): void {
    this.editing.set(r);
    this.formError.set(null);
    this.form.patchValue({
      clienteId:        r.clienteId,
      numeroFactura:    r.numeroFactura ?? '',
      importe:          r.importe,
      fechaVencimiento: r.fechaVencimiento ?? '',
      fechaDevolucion:  r.fechaDevolucion ?? '',
      estado:           r.estado,
      prioridad:        r.prioridad,
      colaborador:      r.colaborador ?? '',
      motivoDevolucion: r.motivoDevolucion ?? '',
      observaciones:    r.observaciones ?? '',
    });
    this.dialogOpen.set(true);
  }

  protected closeDialog(): void { this.dialogOpen.set(false); this.editing.set(null); }

  protected submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const payload: GestionImpagoPayload = {
      clienteId:        v.clienteId!,
      numeroFactura:    v.numeroFactura   || null,
      importe:          v.importe         ?? 0,
      fechaVencimiento: v.fechaVencimiento || null,
      fechaDevolucion:  v.fechaDevolucion  || null,
      estado:           (v.estado    as EstadoGestionImpago)     || 'nuevo',
      prioridad:        (v.prioridad as PrioridadGestionImpago)  || 'media',
      colaborador:      v.colaborador      || null,
      motivoDevolucion: v.motivoDevolucion || null,
      observaciones:    v.observaciones    || null,
    };
    this.submitting.set(true);
    this.formError.set(null);
    this.globalLoading.start('Guardando', 'Procesando impago…');

    const r   = this.editing();
    const obs = r ? this.service.update(r.id, payload) : this.service.create(payload);
    obs.subscribe({
      next: () => {
        this.submitting.set(false);
        this.globalLoading.stop();
        this.closeDialog();
        this.notify.success(r ? 'Actualizado correctamente' : 'Creado correctamente');
        this.reload(this.page());
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.globalLoading.stop();
        this.formError.set(extractMessage(err));
      },
    });
  }

  // ── Inline estado change ──────────────────────────────────────────────────
  protected readonly savingEstadoId = signal<string | null>(null);

  protected changeEstado(r: GestionImpago, newEstado: string): void {
    if (newEstado === r.estado || this.savingEstadoId()) return;
    this.savingEstadoId.set(r.id);
    this.service.actualizarEstado(r.id, { estado: newEstado as EstadoGestionImpago }).subscribe({
      next: (updated) => {
        const page = this.result();
        if (page) {
          const content = page.content.map(x => x.id === r.id ? { ...x, estado: updated.estado } : x);
          this.result.set({ ...page, content });
        }
        this.savingEstadoId.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.notify.error(extractMessage(err));
        this.savingEstadoId.set(null);
      },
    });
  }

  protected estadoSelectClass(estado: EstadoGestionImpago): string {
    const base = 'h-7 px-2 rounded-full text-xs font-semibold border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors disabled:opacity-60';
    const map: Record<string, string> = {
      pagado:             'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-50',
      va_a_pagar:         'bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-50',
      acuerdo_pago:       'bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-50',
      aviso_corte:        'bg-amber-100 text-amber-800 dark:bg-amber-600 dark:text-amber-50',
      cortado:            'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-50',
      ovc:                'bg-purple-100 text-purple-800 dark:bg-purple-700 dark:text-purple-50',
      predemanda:         'bg-orange-100 text-orange-800 dark:bg-orange-600 dark:text-orange-50',
      demanda:            'bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-50',
      juicio:             'bg-red-300 text-red-900 dark:bg-red-900 dark:text-red-50',
      remesar_nuevamente: 'bg-amber-100 text-amber-900 dark:bg-amber-700 dark:text-amber-50',
      otros:              'bg-slate-100 text-slate-700 dark:bg-slate-600 dark:text-slate-100',
      nuevo:              'bg-slate-100 text-slate-600 dark:bg-slate-600 dark:text-slate-100',
    };
    return `${base} ${map[estado] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-600 dark:text-slate-100'}`;
  }

  // ── Export CSV ────────────────────────────────────────────────────────────
  protected readonly exporting = signal(false);

  protected exportCsv(): void {
    if (this.exporting()) return;
    this.exporting.set(true);
    const filter: GestionImpagoFilter = {
      q:      this.q || undefined,
      estado: this.estadoFilter || undefined,
    };
    this.service.exportCsv(filter).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = `impagos_export_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        this.exporting.set(false);
      },
      error: () => {
        this.notify.error('Error al exportar CSV');
        this.exporting.set(false);
      },
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  protected confirmDelete(r: GestionImpago): void {
    if (!confirm(`¿Eliminar el impago "${r.numeroFactura ?? r.id}"?`)) return;
    this.globalLoading.start('Eliminando', '');
    this.service.delete(r.id).subscribe({
      next:  () => { this.globalLoading.stop(); this.notify.success('Eliminado'); this.reload(this.page()); },
      error: (err: HttpErrorResponse) => { this.globalLoading.stop(); this.notify.error(extractMessage(err)); },
    });
  }

  // ── Display helpers ───────────────────────────────────────────────────────
  protected estadoTone(estado: EstadoGestionImpago): StatusTone     { return estadoToneFn(estado); }
  protected prioridadTone(p: PrioridadGestionImpago): StatusTone    { return prioridadToneFn(p); }
  protected formatEur(v: number): string {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v);
  }
  protected fmt(v: string | null): string {
    return v ? new Date(v).toLocaleDateString('es-ES') : '—';
  }
}
