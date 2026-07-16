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
import { FacturaContabilidadService } from '../../core/services/factura-contabilidad.service';
import { MasterDataService } from '../../core/services/master-data.service';
import { GlobalLoadingService } from '../../core/services/global-loading.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  ApiErrorResponse,
  FACTURA_ESTADO_LABEL,
  FACTURA_ESTADO_VALUES,
  FacturaContabilidad,
  FacturaContabilidadEstado,
  FacturaContabilidadResumen,
} from '../../core/models';
import { formatDate, formatEuro } from '../../shared/utils/format';

const ESTADO_TONE: Record<FacturaContabilidadEstado, StatusTone> = {
  enviado_a_pago: 'warning',
  cobrado_en_cuenta: 'info',
  pagado: 'success',
};

@Component({
  selector: 'app-facturas-contabilidad',
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
  templateUrl: './facturas-contabilidad.html',
})
export class FacturasContabilidad {
  private readonly service = inject(FacturaContabilidadService);
  private readonly masterData = inject(MasterDataService);
  private readonly globalLoading = inject(GlobalLoadingService);
  private readonly notify = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly estados = FACTURA_ESTADO_VALUES;

  // Filtros
  protected q = '';
  protected estado: FacturaContabilidadEstado | '' = '';
  protected startDate = '';
  protected endDate = '';

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly result = signal<{ resumen: FacturaContabilidadResumen; rows: FacturaContabilidad[]; totalElements: number; totalPages: number } | null>(null);
  protected readonly page = signal(0);
  protected readonly size = signal(20);

  protected readonly createOpen = signal(false);
  protected readonly editId     = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly formError  = signal<string | null>(null);

  protected readonly resumen = computed(() => this.result()?.resumen ?? null);
  protected readonly rows = computed(() => this.result()?.rows ?? []);
  protected readonly totalElements = computed(() => this.result()?.totalElements ?? 0);
  protected readonly totalPages = computed(() => this.result()?.totalPages ?? 0);

  protected readonly createForm = this.fb.group({
    fechaFactura: this.fb.nonNullable.control('', [Validators.required]),
    numeroFactura: this.fb.nonNullable.control(''),
    proveedor: this.fb.nonNullable.control('', [Validators.required]),
    cifProveedor: this.fb.nonNullable.control(''),
    concepto: this.fb.nonNullable.control(''),
    baseImponible: this.fb.control<number | null>(null),
    ivaPct: this.fb.control<number | null>(21),
    total: this.fb.control<number | null>(null, [Validators.required]),
    estado: this.fb.nonNullable.control<FacturaContabilidadEstado>('enviado_a_pago', [Validators.required]),
    fechaVencimiento: this.fb.nonNullable.control(''),
    transferencia: this.fb.nonNullable.control(false),
    fechaPago: this.fb.nonNullable.control(''),
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
          startDate: this.startDate || undefined,
          endDate: this.endDate || undefined,
        },
        { page, size: this.size(), sort: 'fechaFactura,desc' },
      )
      .subscribe({
        next: (res) => {
          this.result.set({
            resumen: res.resumen,
            rows: res.detalle.content,
            totalElements: res.detalle.totalElements,
            totalPages: res.detalle.totalPages,
          });
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
    this.startDate = '';
    this.endDate = '';
    this.reload(0);
  }

  protected updateTotal(): void {
    const v = this.createForm.getRawValue();
    const base = v.baseImponible ?? 0;
    const iva = v.ivaPct ?? 0;
    this.createForm.patchValue(
      { total: parseFloat((base * (1 + iva / 100)).toFixed(2)) },
      { emitEvent: false },
    );
  }

  protected openCreate(): void {
    this.formError.set(null);
    this.editId.set(null);
    this.createForm.reset({
      fechaFactura: '',
      numeroFactura: '',
      proveedor: '',
      cifProveedor: '',
      concepto: '',
      baseImponible: null,
      ivaPct: 21,
      total: null,
      estado: 'enviado_a_pago',
      fechaVencimiento: '',
      transferencia: false,
      fechaPago: '',
      comentarios: '',
    });
    this.createOpen.set(true);
  }

  protected openEdit(row: FacturaContabilidad): void {
    this.formError.set(null);
    this.editId.set(row.id);
    this.createForm.reset({
      fechaFactura: row.fechaFactura ?? '',
      numeroFactura: row.numeroFactura ?? '',
      proveedor: row.proveedor,
      cifProveedor: row.cifProveedor ?? '',
      concepto: row.concepto ?? '',
      baseImponible: row.baseImponible,
      ivaPct: row.ivaPct,
      total: row.total,
      estado: row.estado,
      fechaVencimiento: row.fechaVencimiento ?? '',
      transferencia: row.transferencia ?? false,
      fechaPago: row.fechaPago ?? '',
      comentarios: row.comentarios ?? '',
    });
    this.createOpen.set(true);
  }

  protected closeCreate(): void {
    this.createOpen.set(false);
    this.editId.set(null);
  }

  protected submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    const v = this.createForm.getRawValue();
    const payload = {
      fechaFactura: v.fechaFactura,
      numeroFactura: v.numeroFactura || null,
      proveedor: v.proveedor,
      cifProveedor: v.cifProveedor || null,
      concepto: v.concepto || null,
      baseImponible: v.baseImponible ?? null,
      ivaPct: v.ivaPct ?? 0,
      total: v.total!,
      estado: v.estado,
      fechaVencimiento: v.fechaVencimiento || null,
      transferencia: v.transferencia,
      fechaPago: v.fechaPago || null,
      delegacionId: null,
      comentarios: v.comentarios || null,
    };

    const id = this.editId();
    this.submitting.set(true);
    this.formError.set(null);
    this.globalLoading.start(id ? 'Guardando cambios' : 'Guardando factura', '');

    const request$ = id
      ? this.service.update(id, payload)
      : this.service.create(payload);

    request$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.globalLoading.stop();
        this.closeCreate();
        this.notify.success(id ? 'Factura actualizada' : 'Factura creada');
        this.reload(this.page());
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.globalLoading.stop();
        this.formError.set(extractMessage(err));
      },
    });
  }

  protected estatusTone(estado: FacturaContabilidadEstado): StatusTone {
    return ESTADO_TONE[estado];
  }

  protected estatusLabel(estado: FacturaContabilidadEstado): string {
    return FACTURA_ESTADO_LABEL[estado];
  }

  protected date(value: string | null): string {
    return formatDate(value);
  }

  protected euro(value: number | null | undefined): string {
    return formatEuro(value ?? null);
  }

  protected pct(value: number): string {
    return `${value}%`;
  }
}

function extractMessage(error: HttpErrorResponse): string {
  const body = error.error as ApiErrorResponse | undefined;
  if (body?.message) return body.message;
  if (error.status === 0) return 'No se puede conectar con el servidor';
  return error.message || 'Error al cargar las facturas';
}
