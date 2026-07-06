import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { PageHeader } from '../../shared/components/page-header/page-header';
import { StatusBadge, StatusTone } from '../../shared/components/status-badge/status-badge';
import { Pagination } from '../../shared/components/pagination/pagination';
import { TableSkeleton } from '../../shared/components/table-skeleton/table-skeleton';
import { LoadingOverlay } from '../../shared/components/loading-overlay/loading-overlay';
import { FormDialog } from '../../shared/components/form-dialog/form-dialog';
import { RemoteSelect, RemoteOption } from '../../shared/components/remote-select/remote-select';
import { Icon } from '../../shared/icons/icon';
import { SupplyService } from '../../core/services/supply.service';
import { CustomerService } from '../../core/services/customer.service';
import { GlobalLoadingService } from '../../core/services/global-loading.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { MasterDataService } from '../../core/services/master-data.service';
import {
  ApiErrorResponse,
  Page,
  Supply,
  SUPPLY_TYPE_LABEL,
  SUPPLY_TYPE_VALUES,
  SupplyType,
} from '../../core/models';
import { formatMwh, formatNumber, safeText } from '../../shared/utils/format';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

const TYPE_TONE: Record<SupplyType, StatusTone> = {
  E: 'warning',
  G: 'info',
  OTRO: 'neutral',
};

@Component({
  selector: 'app-supplies',
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
    RemoteSelect,
    Icon,
  ],
  templateUrl: './supplies.html',
})
export class Supplies {
  private readonly service = inject(SupplyService);
  private readonly customerService = inject(CustomerService);
  private readonly globalLoading = inject(GlobalLoadingService);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);
  private readonly masterData = inject(MasterDataService);
  private readonly fb = inject(FormBuilder);

  protected cups = '';
  protected activeOnly = false;

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly result = signal<Page<Supply> | null>(null);
  protected readonly page = signal(0);
  protected readonly size = signal(20);

  protected readonly modalOpen = signal(false);
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly types = SUPPLY_TYPE_VALUES;

  protected readonly searchClientes = (q: string): Observable<RemoteOption[]> =>
    this.customerService
      .list({ q: q || undefined, activeOnly: true }, { size: 50, sort: 'nombre,asc' })
      .pipe(
        map((res) =>
          res.content.map((c) => ({ id: c.id, label: c.nombre, sublabel: c.nif ?? undefined })),
        ),
      );

  protected readonly form = this.fb.nonNullable.group({
    clienteId: ['', [Validators.required]],
    cups: ['', [Validators.required]],
    tipo: ['E' as SupplyType, [Validators.required]],
    tarifa: [''],
    consumoUltimos12Meses: [null as number | null],
    potenciaP1: [null as number | null],
    provincia: [''],
    poblacion: [''],
    codigoPostal: [''],
    activo: [true],
  });

  protected readonly rows = computed(() => this.result()?.content ?? []);
  protected readonly totalElements = computed(() => this.result()?.totalElements ?? 0);
  protected readonly totalPages = computed(() => this.result()?.totalPages ?? 0);

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
          cups: this.cups.trim() || undefined,
          activeOnly: this.activeOnly || undefined,
        },
        { page, size: this.size(), sort: 'cups,asc' },
      )
      .subscribe({
        next: (response) => {
          this.result.set(response);
          this.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage.set(extractMessage(err));
          this.loading.set(false);
        },
      });
  }

  protected onSearchChange(): void {
    if (this.debounce) {
      clearTimeout(this.debounce);
    }
    this.debounce = setTimeout(() => this.reload(0), 300);
  }

  protected onSizeChange(size: number): void {
    this.size.set(size);
    this.reload(0);
  }

  protected openCreate(): void {
    this.formError.set(null);
    this.form.reset({
      clienteId: '',
      cups: '',
      tipo: 'E',
      tarifa: '',
      consumoUltimos12Meses: null,
      potenciaP1: null,
      provincia: '',
      poblacion: '',
      codigoPostal: '',
      activo: true,
    });
    this.modalOpen.set(true);
  }

  protected closeModal(): void {
    this.modalOpen.set(false);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.submitting.set(true);
    this.formError.set(null);
    this.globalLoading.start('Guardando suministro', 'Registrando el nuevo punto de suministro.');

    this.service
      .create({
        clienteId: value.clienteId,
        cups: value.cups,
        tipo: value.tipo,
        tarifa: value.tarifa || null,
        consumoUltimos12Meses: value.consumoUltimos12Meses,
        potenciaP1: value.potenciaP1,
        provincia: value.provincia || null,
        poblacion: value.poblacion || null,
        codigoPostal: value.codigoPostal || null,
        activo: value.activo,
      })
      .subscribe({
        next: (created: Supply) => {
          this.submitting.set(false);
          this.globalLoading.stop();
          this.masterData.upsertSuministro(created);
          this.closeModal();
          this.notify.success('Suministro creado');
          this.reload(0);
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          this.globalLoading.stop();
          this.formError.set(extractMessage(err));
        },
      });
  }

  protected async confirmDelete(row: Supply): Promise<void> {
    const ok = await this.confirm.ask({
      header: 'Eliminar suministro',
      message: `¿Eliminar el suministro <b class="font-mono">${row.cups}</b>? Esta acción es irreversible.`,
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      variant: 'danger',
    });
    if (!ok) return;
    this.globalLoading.start('Eliminando suministro', 'Eliminando el punto de suministro.');
    this.service.delete(row.id).subscribe({
      next: () => {
        this.globalLoading.stop();
        this.notify.success(`Suministro ${row.cups} eliminado`);
        this.reload(this.page());
      },
      error: (err: HttpErrorResponse) => {
        this.globalLoading.stop();
        this.notify.error(extractMessage(err));
      },
    });
  }

  protected typeTone(type: SupplyType): StatusTone {
    return TYPE_TONE[type];
  }

  protected typeLabel(type: SupplyType): string {
    return SUPPLY_TYPE_LABEL[type];
  }

  protected text(value: string | null, fallback = '—'): string {
    return safeText(value, fallback);
  }

  protected num(value: number | null): string {
    return formatNumber(value);
  }

  protected mwh(value: number | null): string {
    return formatMwh(value);
  }
}

function extractMessage(error: HttpErrorResponse): string {
  const body = error.error as ApiErrorResponse | undefined;
  if (body?.message) {
    return body.message;
  }
  if (error.status === 0) {
    return 'No se puede conectar con el servidor';
  }
  return error.message || 'Error al cargar los suministros';
}
