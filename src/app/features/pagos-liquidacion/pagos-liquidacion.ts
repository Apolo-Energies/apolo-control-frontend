import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { PageHeader } from '../../shared/components/page-header/page-header';
import { StatusBadge, StatusTone } from '../../shared/components/status-badge/status-badge';
import { Pagination } from '../../shared/components/pagination/pagination';
import { TableSkeleton } from '../../shared/components/table-skeleton/table-skeleton';
import { LoadingOverlay } from '../../shared/components/loading-overlay/loading-overlay';
import { FormDialog } from '../../shared/components/form-dialog/form-dialog';
import { Icon } from '../../shared/icons/icon';
import { PagosLiquidacionService } from '../../core/services/pagos-liquidacion.service';
import { MasterDataService } from '../../core/services/master-data.service';
import { GlobalLoadingService } from '../../core/services/global-loading.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmService } from '../../core/services/confirm.service';
import {
  ApiErrorResponse,
  EstadoPago,
  ESTADO_PAGO_LABEL,
  ESTADO_PAGO_VALUES,
  FormaPago,
  FORMA_PAGO_LABEL,
  FORMA_PAGO_VALUES,
  Page,
  PagoLiquidacion,
  TipoPago,
  TIPO_PAGO_LABEL,
  TIPO_PAGO_VALUES,
} from '../../core/models';
import { formatDate, formatEuro } from '../../shared/utils/format';

const ESTADO_TONE: Record<EstadoPago, StatusTone> = {
  pendiente: 'warning',
  pagado: 'success',
  cancelado: 'neutral',
};

const TIPO_TONE: Record<TipoPago, StatusTone> = {
  comision: 'info',
  liquidacion: 'purple',
  bonus: 'success',
  multa: 'danger',
  penalizacion: 'danger',
  adelanto: 'warning',
  diferencia: 'warning',
  embargo: 'danger',
  otro: 'neutral',
};

@Component({
  selector: 'app-pagos-liquidacion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    PageHeader,
    StatusBadge,
    Pagination,
    TableSkeleton,
    LoadingOverlay,
    FormDialog,
    Icon,
  ],
  templateUrl: './pagos-liquidacion.html',
})
export class PagosLiquidacion {
  private readonly service = inject(PagosLiquidacionService);
  private readonly masterData = inject(MasterDataService);
  private readonly globalLoading = inject(GlobalLoadingService);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);

  protected readonly estadoValues = ESTADO_PAGO_VALUES;
  protected readonly tipoValues = TIPO_PAGO_VALUES;
  protected readonly formaValues = FORMA_PAGO_VALUES;
  protected readonly delegaciones = this.masterData.delegacionesActivas;

  // Filtros
  protected q = '';
  protected estado: EstadoPago | '' = '';
  protected tipo: TipoPago | '' = '';
  protected delegacionId = '';
  protected startDate = '';
  protected endDate = '';

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly result = signal<Page<PagoLiquidacion> | null>(null);
  protected readonly page = signal(0);
  protected readonly size = signal(20);

  protected readonly createOpen = signal(false);
  protected readonly editOpen = signal(false);
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly editing = signal<PagoLiquidacion | null>(null);

  protected readonly rows = computed(() => this.result()?.content ?? []);
  protected readonly totalElements = computed(() => this.result()?.totalElements ?? 0);
  protected readonly totalPages = computed(() => this.result()?.totalPages ?? 0);

  // KPIs calculados desde la respuesta paginada completa (suma acumulada)
  protected readonly totalImporte = computed(() =>
    this.rows().reduce((s, r) => s + r.importe, 0),
  );
  protected readonly totalNeto = computed(() =>
    this.rows().reduce((s, r) => s + r.importeNeto, 0),
  );
  protected readonly totalPendiente = computed(() =>
    this.rows().filter(r => r.estado === 'pendiente').reduce((s, r) => s + r.importeNeto, 0),
  );

  protected readonly form = this.fb.group({
    colaboradorNombre: this.fb.nonNullable.control('', [Validators.required]),
    concepto: this.fb.nonNullable.control('', [Validators.required]),
    importe: this.fb.control<number | null>(null, [Validators.required]),
    importePenalizacion: this.fb.control<number | null>(null),
    conceptoPenalizacion: this.fb.nonNullable.control(''),
    tipo: this.fb.nonNullable.control<TipoPago>('comision', [Validators.required]),
    formaPago: this.fb.nonNullable.control<FormaPago | ''>(''),
    estado: this.fb.nonNullable.control<EstadoPago>('pendiente'),
    delegacionId: this.fb.nonNullable.control(''),
    numeroCuenta: this.fb.nonNullable.control(''),
    emailColaborador: this.fb.nonNullable.control(''),
    mesLiquidacion: this.fb.control<number | null>(null),
    anioLiquidacion: this.fb.control<number | null>(null),
    fechaLiquidacion: this.fb.nonNullable.control(''),
    fechaPago: this.fb.nonNullable.control(''),
    referencia: this.fb.nonNullable.control(''),
    comentarios: this.fb.nonNullable.control(''),
  });

  private debounce: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.reload(0);
  }

  protected reload(page: number): void {
    this.page.set(page);
    this.loading.set(true);
    this.errorMessage.set(null);
    this.service
      .list(
        {
          q: this.q.trim() || undefined,
          estado: this.estado || undefined,
          tipo: this.tipo || undefined,
          delegacionId: this.delegacionId || undefined,
          startDate: this.startDate || undefined,
          endDate: this.endDate || undefined,
        },
        { page, size: this.size(), sort: 'createdAt,desc' },
      )
      .subscribe({
        next: (res) => {
          this.result.set(res);
          this.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage.set(extractMessage(err));
          this.loading.set(false);
        },
      });
  }

  protected onSearchChange(): void {
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = setTimeout(() => this.reload(0), 300);
  }

  protected onSizeChange(size: number): void {
    this.size.set(size);
    this.reload(0);
  }

  protected clearFilters(): void {
    this.q = '';
    this.estado = '';
    this.tipo = '';
    this.delegacionId = '';
    this.startDate = '';
    this.endDate = '';
    this.reload(0);
  }

  // ── Crear ──
  protected openCreate(): void {
    this.formError.set(null);
    this.form.reset({
      colaboradorNombre: '',
      concepto: '',
      importe: null,
      importePenalizacion: null,
      conceptoPenalizacion: '',
      tipo: 'comision',
      formaPago: '',
      estado: 'pendiente',
      delegacionId: '',
      numeroCuenta: '',
      emailColaborador: '',
      mesLiquidacion: null,
      anioLiquidacion: null,
      fechaLiquidacion: '',
      fechaPago: '',
      referencia: '',
      comentarios: '',
    });
    this.createOpen.set(true);
  }

  protected closeCreate(): void {
    this.createOpen.set(false);
  }

  protected submitCreate(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.submitting.set(true);
    this.formError.set(null);
    this.globalLoading.start('Guardando pago', 'Registrando el nuevo pago / liquidación.');

    this.service
      .create(buildPayload(v))
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.globalLoading.stop();
          this.closeCreate();
          this.notify.success('Pago registrado');
          this.reload(0);
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          this.globalLoading.stop();
          this.formError.set(extractMessage(err));
        },
      });
  }

  // ── Editar ──
  protected openEdit(row: PagoLiquidacion): void {
    this.editing.set(row);
    this.formError.set(null);
    this.form.patchValue({
      colaboradorNombre: row.colaboradorNombre,
      concepto: row.concepto,
      importe: row.importe,
      importePenalizacion: row.importePenalizacion || null,
      conceptoPenalizacion: row.conceptoPenalizacion ?? '',
      tipo: row.tipo,
      formaPago: row.formaPago ?? '',
      estado: row.estado,
      delegacionId: row.delegacionId ?? '',
      numeroCuenta: row.numeroCuenta ?? '',
      emailColaborador: row.emailColaborador ?? '',
      mesLiquidacion: row.mesLiquidacion,
      anioLiquidacion: row.anioLiquidacion,
      fechaLiquidacion: row.fechaLiquidacion ?? '',
      fechaPago: row.fechaPago ?? '',
      referencia: row.referencia ?? '',
      comentarios: row.comentarios ?? '',
    });
    this.editOpen.set(true);
  }

  protected closeEdit(): void {
    this.editOpen.set(false);
    this.editing.set(null);
  }

  protected submitEdit(): void {
    const row = this.editing();
    if (!row || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.submitting.set(true);
    this.formError.set(null);
    this.globalLoading.start('Guardando cambios', 'Actualizando el pago / liquidación.');

    this.service
      .update(row.id, buildPayload(v))
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.globalLoading.stop();
          this.closeEdit();
          this.notify.success('Pago actualizado');
          this.reload(this.page());
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          this.globalLoading.stop();
          this.formError.set(extractMessage(err));
        },
      });
  }

  // ── Eliminar ──
  protected async confirmDelete(row: PagoLiquidacion): Promise<void> {
    const ok = await this.confirm.ask({
      header: 'Eliminar pago',
      message: `¿Eliminar el pago de <b>${row.colaboradorNombre}</b> por ${formatEuro(row.importe)}?`,
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      variant: 'danger',
    });
    if (!ok) return;

    this.globalLoading.start('Eliminando', 'Eliminando el registro de pago.');
    this.service.delete(row.id).subscribe({
      next: () => {
        this.globalLoading.stop();
        this.notify.success('Pago eliminado');
        this.reload(this.page());
      },
      error: (err: HttpErrorResponse) => {
        this.globalLoading.stop();
        this.errorMessage.set(extractMessage(err));
      },
    });
  }

  // ── Formatters ──
  protected estadoTone(e: EstadoPago): StatusTone { return ESTADO_TONE[e]; }
  protected estadoLabel(e: EstadoPago): string { return ESTADO_PAGO_LABEL[e]; }
  protected tipoTone(t: TipoPago): StatusTone { return TIPO_TONE[t]; }
  protected tipoLabel(t: TipoPago): string { return TIPO_PAGO_LABEL[t]; }
  protected formaLabel(f: FormaPago | null): string { return f ? FORMA_PAGO_LABEL[f] : '—'; }
  protected date(v: string | null): string { return formatDate(v); }
  protected euro(v: number | null | undefined): string { return formatEuro(v ?? null); }
}

type FormValue = {
  colaboradorNombre: string;
  concepto: string;
  importe: number | null;
  importePenalizacion: number | null;
  conceptoPenalizacion: string;
  tipo: TipoPago;
  formaPago: FormaPago | '';
  estado: EstadoPago;
  delegacionId: string;
  numeroCuenta: string;
  emailColaborador: string;
  mesLiquidacion: number | null;
  anioLiquidacion: number | null;
  fechaLiquidacion: string;
  fechaPago: string;
  referencia: string;
  comentarios: string;
};

function buildPayload(v: FormValue) {
  return {
    colaboradorNombre: v.colaboradorNombre,
    concepto: v.concepto,
    importe: v.importe!,
    importePenalizacion: v.importePenalizacion ?? null,
    conceptoPenalizacion: v.conceptoPenalizacion || null,
    tipo: v.tipo,
    formaPago: (v.formaPago || null) as FormaPago | null,
    estado: v.estado,
    delegacionId: v.delegacionId || null,
    numeroCuenta: v.numeroCuenta || null,
    emailColaborador: v.emailColaborador || null,
    mesLiquidacion: v.mesLiquidacion,
    anioLiquidacion: v.anioLiquidacion,
    fechaLiquidacion: v.fechaLiquidacion || null,
    fechaPago: v.fechaPago || null,
    referencia: v.referencia || null,
    comentarios: v.comentarios || null,
  };
}

function extractMessage(error: HttpErrorResponse): string {
  const body = error.error as ApiErrorResponse | undefined;
  if (body?.message) return body.message;
  if (error.status === 0) return 'No se puede conectar con el servidor';
  return error.message || 'Error al cargar los pagos';
}
