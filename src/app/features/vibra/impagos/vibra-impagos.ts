import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { FormDialog } from '../../../shared/components/form-dialog/form-dialog';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { TableSkeleton } from '../../../shared/components/table-skeleton/table-skeleton';
import { Icon } from '../../../shared/icons/icon';

import { VibraImpagoService } from '../../../core/services/vibra-impago.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  ESTADO_VIBRA_IMPAGO_VALUES,
  Page,
  VibraImpago,
  VibraImpagoPayload,
} from '../../../core/models';

@Component({
  selector: 'app-vibra-impagos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, ReactiveFormsModule, RouterLink,
    PageHeader, FormDialog, Pagination, StatusBadge, TableSkeleton, Icon,
  ],
  templateUrl: './vibra-impagos.html',
})
export class VibraImpagos {
  private readonly service = inject(VibraImpagoService);
  private readonly notify = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly result = signal<Page<VibraImpago> | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly page = signal(0);
  protected readonly size = signal(20);
  protected q = '';
  protected estadoFilter = '';

  protected readonly estadoValues = ESTADO_VIBRA_IMPAGO_VALUES;

  protected readonly rows = computed(() => this.result()?.content ?? []);
  protected readonly total = computed(() => this.result()?.totalElements ?? 0);
  protected readonly totalPages = computed(() => this.result()?.totalPages ?? 0);

  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<VibraImpago | null>(null);
  protected readonly submitting = signal(false);

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

  constructor() { this.load(); }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.list(
      { q: this.q, estado: this.estadoFilter || undefined },
      { page: this.page(), size: this.size(), sort: 'fechaDevolucion,desc' },
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

  protected changeEstado(r: VibraImpago, estado: string): void {
    this.service.cambiarEstado(r.id, { estado }).subscribe({
      next: () => { this.notify.success('Estado actualizado'); this.load(); },
      error: (err: HttpErrorResponse) => this.notify.error(err.error?.message ?? 'Error'),
    });
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.form.reset({ estado: 'Pdte. contactar', activoBaja: 'Activo' });
    this.dialogOpen.set(true);
  }

  protected openEdit(r: VibraImpago): void {
    this.editing.set(r);
    this.form.reset({
      cliente: r.cliente ?? '', factura: r.factura ?? '', importe: r.importe,
      fechaDevolucion: r.fechaDevolucion, estado: r.estado ?? 'Pdte. contactar',
      motivoDevolucion: r.motivoDevolucion ?? '', activoBaja: r.activoBaja ?? 'Activo',
      colaborador: r.colaborador ?? '', comentarios: r.comentarios ?? '',
    });
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

  protected confirmDelete(r: VibraImpago): void {
    if (!confirm(`Eliminar impago de ${r.cliente}?`)) return;
    this.service.delete(r.id).subscribe({
      next: () => { this.notify.success('Impago eliminado'); this.load(); },
      error: (err: HttpErrorResponse) => this.notify.error(err.error?.message ?? 'Error'),
    });
  }

  protected exportExcel(): void {
    this.service.exportExcel({ q: this.q, estado: this.estadoFilter || undefined }).subscribe({
      next: (blob) => this.downloadBlob(blob, 'vibra-impagos.xlsx'),
      error: () => this.notify.error('Error al descargar Excel'),
    });
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
