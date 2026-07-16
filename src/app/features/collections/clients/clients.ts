import {
  ChangeDetectionStrategy, Component, computed, inject, signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

import { PageHeader }    from '../../../shared/components/page-header/page-header';
import { TableSkeleton } from '../../../shared/components/table-skeleton/table-skeleton';
import { StatusBadge, StatusTone } from '../../../shared/components/status-badge/status-badge';
import { Pagination }    from '../../../shared/components/pagination/pagination';
import { FormDialog }    from '../../../shared/components/form-dialog/form-dialog';
import { Icon }          from '../../../shared/icons/icon';

import { GestionImpagoClienteService } from '../../../core/services/gestion-impago-cliente.service';
import { NotificationService }         from '../../../core/services/notification.service';
import { GlobalLoadingService }        from '../../../core/services/global-loading.service';
import {
  GestionImpagoCliente, GestionImpagoClientePayload,
  NivelRiesgoGestionCliente, NIVEL_RIESGO_LABEL, Page,
} from '../../../core/models';

function extractMessage(err: HttpErrorResponse): string {
  return (err.error as { message?: string })?.message ?? err.message ?? 'Error inesperado';
}

function nivelToneFn(nivel: NivelRiesgoGestionCliente): StatusTone {
  switch (nivel) {
    case 'bajo':    return 'success';
    case 'medio':   return 'info';
    case 'alto':    return 'warning';
    case 'critico': return 'danger';
    default:        return 'neutral';
  }
}

@Component({
  selector: 'app-gestion-clients',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeader, TableSkeleton, StatusBadge, Pagination, FormDialog,
    Icon, FormsModule, ReactiveFormsModule,
  ],
  templateUrl: './clients.html',
})
export class GestionClients {
  private readonly service       = inject(GestionImpagoClienteService);
  private readonly notify        = inject(NotificationService);
  private readonly globalLoading = inject(GlobalLoadingService);
  private readonly fb            = inject(FormBuilder);

  // ── List state ────────────────────────────────────────────────────────────
  protected readonly loading       = signal(false);
  protected readonly result        = signal<Page<GestionImpagoCliente> | null>(null);
  protected readonly error         = signal<string | null>(null);
  protected readonly page          = signal(0);
  protected readonly size          = signal(20);

  // ── Filters ───────────────────────────────────────────────────────────────
  protected q = '';

  // ── Constants ─────────────────────────────────────────────────────────────
  protected readonly nivelLabel  = NIVEL_RIESGO_LABEL;
  protected readonly nivelValues: NivelRiesgoGestionCliente[] = ['bajo', 'medio', 'alto', 'critico'];

  protected readonly rows          = computed(() => this.result()?.content ?? []);
  protected readonly totalElements = computed(() => this.result()?.totalElements ?? 0);
  protected readonly totalPages    = computed(() => this.result()?.totalPages ?? 0);

  // ── Dialog state ──────────────────────────────────────────────────────────
  protected readonly dialogOpen  = signal(false);
  protected readonly editing     = signal<GestionImpagoCliente | null>(null);
  protected readonly submitting  = signal(false);
  protected readonly formError   = signal<string | null>(null);

  protected readonly form = this.fb.group({
    nombre:     ['', Validators.required],
    empresa:    [''],
    nif:        [''],
    email:      [''],
    telefono:   [''],
    direccion:  [''],
    nivelRiesgo:['medio'],
    activo:     [true],
    notas:      [''],
  });

  constructor() { this.reload(0); }

  // ── List ──────────────────────────────────────────────────────────────────
  protected reload(p: number): void {
    this.page.set(p);
    this.loading.set(true);
    this.service.list({ q: this.q || undefined }, { page: p, size: this.size() }).subscribe({
      next:  (res) => { this.result.set(res); this.loading.set(false); },
      error: (err: HttpErrorResponse) => { this.error.set(extractMessage(err)); this.loading.set(false); },
    });
  }

  protected onSizeChange(size: number): void { this.size.set(size); this.reload(0); }
  protected applyFilters(): void { this.reload(0); }
  protected clearFilters(): void { this.q = ''; this.reload(0); }

  // ── Create / Edit ─────────────────────────────────────────────────────────
  protected openCreate(): void {
    this.editing.set(null);
    this.formError.set(null);
    this.form.reset({ nivelRiesgo: 'medio', activo: true });
    this.dialogOpen.set(true);
  }

  protected openEdit(c: GestionImpagoCliente): void {
    this.editing.set(c);
    this.formError.set(null);
    this.form.patchValue({
      nombre:      c.nombre,
      empresa:     c.empresa     ?? '',
      nif:         c.nif         ?? '',
      email:       c.email       ?? '',
      telefono:    c.telefono    ?? '',
      direccion:   c.direccion   ?? '',
      nivelRiesgo: c.nivelRiesgo,
      activo:      c.activo,
      notas:       c.notas       ?? '',
    });
    this.dialogOpen.set(true);
  }

  protected closeDialog(): void { this.dialogOpen.set(false); this.editing.set(null); }

  protected submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const payload: GestionImpagoClientePayload = {
      nombre:      v.nombre!,
      empresa:     v.empresa     || null,
      nif:         v.nif         || null,
      email:       v.email       || null,
      telefono:    v.telefono    || null,
      direccion:   v.direccion   || null,
      nivelRiesgo: (v.nivelRiesgo as NivelRiesgoGestionCliente) || 'medio',
      activo:      v.activo      ?? true,
      notas:       v.notas       || null,
    };
    this.submitting.set(true);
    this.formError.set(null);
    this.globalLoading.start('Guardando', '');

    const c   = this.editing();
    const obs = c ? this.service.update(c.id, payload) : this.service.create(payload);
    obs.subscribe({
      next: () => {
        this.submitting.set(false);
        this.globalLoading.stop();
        this.closeDialog();
        this.notify.success(c ? 'Cliente actualizado' : 'Cliente creado');
        this.reload(this.page());
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.globalLoading.stop();
        this.formError.set(extractMessage(err));
      },
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  protected confirmDelete(c: GestionImpagoCliente): void {
    if (!confirm(`¿Eliminar el cliente "${c.nombre}"?`)) return;
    this.globalLoading.start('Eliminando', '');
    this.service.delete(c.id).subscribe({
      next:  () => { this.globalLoading.stop(); this.notify.success('Eliminado'); this.reload(this.page()); },
      error: (err: HttpErrorResponse) => { this.globalLoading.stop(); this.notify.error(extractMessage(err)); },
    });
  }

  // ── Display helpers ───────────────────────────────────────────────────────
  protected nivelTone(nivel: NivelRiesgoGestionCliente): StatusTone { return nivelToneFn(nivel); }
  protected formatEur(v: number): string {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v);
  }
}
