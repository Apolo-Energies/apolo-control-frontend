import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { FormDialog } from '../../../shared/components/form-dialog/form-dialog';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { TableSkeleton } from '../../../shared/components/table-skeleton/table-skeleton';
import { Icon } from '../../../shared/icons/icon';

import { TelkesImpagoService } from '../../../core/services/telkes-impago.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  ESTADO_TELKES_IMPAGO_VALUES,
  Page,
  TelkesImpago,
  TelkesImpagoPayload,
} from '../../../core/models';

@Component({
  selector: 'app-telkes-impagos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, ReactiveFormsModule, RouterLink,
    PageHeader, FormDialog, ConfirmDialog, Pagination, StatusBadge, TableSkeleton, Icon,
  ],
  templateUrl: './telkes-impagos.html',
})
export class TelkesImpagos {
  private readonly service = inject(TelkesImpagoService);
  private readonly notify = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly result = signal<Page<TelkesImpago> | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly page = signal(0);
  protected readonly size = signal(20);
  protected q = '';
  protected estadoFilter = '';

  protected readonly estadoValues = ESTADO_TELKES_IMPAGO_VALUES;
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

  protected readonly rows = computed(() => this.result()?.content ?? []);
  protected readonly total = computed(() => this.result()?.totalElements ?? 0);
  protected readonly totalPages = computed(() => this.result()?.totalPages ?? 0);

  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<TelkesImpago | null>(null);
  protected readonly submitting = signal(false);

  // Confirm delete
  protected readonly confirmOpen = signal(false);
  protected readonly pendingDelete = signal<TelkesImpago | null>(null);
  protected readonly deleting = signal(false);

  // Detail modal
  protected readonly detailOpen = signal(false);
  protected readonly detailData = signal<TelkesImpago | null>(null);
  protected readonly detailLoading = signal(false);

  protected readonly form = this.fb.group({
    cliente: ['', Validators.required],
    factura: [''],
    importe: [null as number | null],
    fechaDevolucion: [null as string | null],
    estado: ['Pdte. contactar'],
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

  protected changeEstado(r: TelkesImpago, estado: string): void {
    this.service.cambiarEstado(r.id, { estado }).subscribe({
      next: () => { this.notify.success('Estado actualizado'); this.load(); },
      error: (err: HttpErrorResponse) => this.notify.error(err.error?.message ?? 'Error'),
    });
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.form.reset({ estado: 'Pdte. contactar', activoBaja: 'Activo' });
    this.clienteQuery.set('');
    this.dialogOpen.set(true);
  }

  protected openEdit(r: TelkesImpago): void {
    this.editing.set(r);
    this.form.reset({
      cliente: r.cliente ?? '', factura: r.factura ?? '', importe: r.importe,
      fechaDevolucion: r.fechaDevolucion, estado: r.estado ?? 'Pdte. contactar',
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
    const payload = this.form.getRawValue() as TelkesImpagoPayload;
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

  protected askDelete(r: TelkesImpago): void {
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

  protected estadoTone(estado: string | null): 'success' | 'warning' | 'info' | 'neutral' {
    if (estado === 'Pagado') return 'success';
    if (estado === 'Pdte. contactar') return 'warning';
    if (estado === 'Contactado') return 'info';
    return 'neutral';
  }

  protected activoTone(v: string | null): 'success' | 'danger' {
    return v === 'Baja' ? 'danger' : 'success';
  }

  protected fmtEur(n: number | null): string {
    if (n == null) return '—';
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
  }
}
