import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { FormDialog } from '../../../shared/components/form-dialog/form-dialog';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { Icon } from '../../../shared/icons/icon';

import { TelkesTarifaService } from '../../../core/services/telkes-tarifa.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  TIPO_TARIFA_TELKES_VALUES,
  TelkesTarifa,
  TelkesTarifaPayload,
} from '../../../core/models';

@Component({
  selector: 'app-telkes-preciario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, PageHeader, FormDialog, ConfirmDialog, Icon],
  templateUrl: './telkes-preciario.html',
})
export class TelkesPreciario {
  private readonly service = inject(TelkesTarifaService);
  private readonly notify = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly tarifas = signal<TelkesTarifa[]>([]);
  protected readonly loading = signal(true);
  protected readonly tipoValues = TIPO_TARIFA_TELKES_VALUES;

  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<TelkesTarifa | null>(null);
  protected readonly submitting = signal(false);
  protected readonly confirmOpen = signal(false);
  protected readonly pendingDelete = signal<TelkesTarifa | null>(null);
  protected readonly deleting = signal(false);

  protected readonly form = this.fb.group({
    nombre: ['', Validators.required],
    tipo: ['2.0TD', Validators.required],
    activa: [true],
    p1Energia: [null as number | null], p2Energia: [null as number | null],
    p3Energia: [null as number | null], p4Energia: [null as number | null],
    p5Energia: [null as number | null], p6Energia: [null as number | null],
    p1Potencia: [null as number | null], p2Potencia: [null as number | null],
    p3Potencia: [null as number | null], p4Potencia: [null as number | null],
    p5Potencia: [null as number | null], p6Potencia: [null as number | null],
  });

  protected readonly tipo20 = computed(() => this.tarifas().filter(t => t.tipo === '2.0TD'));
  protected readonly tipo30 = computed(() => this.tarifas().filter(t => t.tipo === '3.0TD'));

  constructor() { this.load(); }

  protected load(): void {
    this.loading.set(true);
    this.service.list().subscribe({
      next: (l) => { this.tarifas.set(l); this.loading.set(false); },
      error: (err: HttpErrorResponse) => {
        this.notify.error(err.error?.message ?? 'Error al cargar tarifas');
        this.loading.set(false);
      },
    });
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.form.reset({ tipo: '2.0TD', activa: true });
    this.dialogOpen.set(true);
  }

  protected openEdit(t: TelkesTarifa): void {
    this.editing.set(t);
    this.form.reset({
      nombre: t.nombre, tipo: t.tipo, activa: t.activa,
      p1Energia: t.p1Energia, p2Energia: t.p2Energia, p3Energia: t.p3Energia,
      p4Energia: t.p4Energia, p5Energia: t.p5Energia, p6Energia: t.p6Energia,
      p1Potencia: t.p1Potencia, p2Potencia: t.p2Potencia, p3Potencia: t.p3Potencia,
      p4Potencia: t.p4Potencia, p5Potencia: t.p5Potencia, p6Potencia: t.p6Potencia,
    });
    this.dialogOpen.set(true);
  }

  protected closeDialog(): void { this.dialogOpen.set(false); }

  protected submit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    const payload = this.form.getRawValue() as TelkesTarifaPayload;
    const t = this.editing();
    const obs = t ? this.service.update(t.id, payload) : this.service.create(payload);
    obs.subscribe({
      next: () => {
        this.submitting.set(false);
        this.notify.success(t ? 'Tarifa actualizada' : 'Tarifa creada');
        this.closeDialog();
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.notify.error(err.error?.message ?? 'Error al guardar');
      },
    });
  }

  protected askDelete(t: TelkesTarifa): void {
    this.pendingDelete.set(t);
    this.confirmOpen.set(true);
  }

  protected cancelDelete(): void {
    this.confirmOpen.set(false);
    this.pendingDelete.set(null);
  }

  protected doDelete(): void {
    const t = this.pendingDelete();
    if (!t) return;
    this.deleting.set(true);
    this.service.delete(t.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.notify.success('Tarifa eliminada');
        this.cancelDelete();
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.deleting.set(false);
        this.notify.error(err.error?.message ?? 'Error');
      },
    });
  }

  protected fmt(n: number | null | undefined): string {
    if (n == null) return '—';
    return Number(n).toFixed(6);
  }
}
