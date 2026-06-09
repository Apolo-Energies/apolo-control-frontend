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
import { ContractService } from '../../core/services/contract.service';
import { MasterDataService } from '../../core/services/master-data.service';
import { GlobalLoadingService } from '../../core/services/global-loading.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  ApiErrorResponse,
  Contract,
  ContractStatus,
  CONTRACT_STATUS_LABEL,
  CONTRACT_STATUS_VALUES,
  Page,
} from '../../core/models';
import { formatDate, formatEuro, safeText } from '../../shared/utils/format';
import { Observable, of } from 'rxjs';

const STATUS_TONE: Record<ContractStatus, StatusTone> = {
  previo: 'info',
  para_estudio: 'info',
  para_tramitar: 'warning',
  para_firma: 'warning',
  valido: 'success',
  confirmado: 'info',
  activo: 'success',
  renovado: 'purple',
  finalizado: 'neutral',
  baja: 'neutral',
  ko: 'danger',
  desestimado: 'danger',
  sin_estado: 'neutral',
};

// Estados asignables manualmente (sin_estado es solo lectura — representa NULL en BD)
const ASSIGNABLE_STATUSES: ContractStatus[] = [
  'previo',
  'para_estudio',
  'para_tramitar',
  'para_firma',
  'valido',
  'confirmado',
  'activo',
  'renovado',
  'finalizado',
  'baja',
  'ko',
  'desestimado',
];

@Component({
  selector: 'app-contracts',
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
  templateUrl: './contracts.html',
})
export class Contracts {
  private readonly service = inject(ContractService);
  private readonly masterData = inject(MasterDataService);
  private readonly globalLoading = inject(GlobalLoadingService);
  private readonly notify = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  // Filtros de la barra superior
  protected statusFilter: ContractStatus | '' = '';
  protected q = '';
  protected startDate = '';
  protected endDate = '';
  protected motivoRechazo = '';

  protected readonly statuses = CONTRACT_STATUS_VALUES;
  protected readonly assignableStatuses = ASSIGNABLE_STATUSES;

  // Motivos de rechazo desde caché local (sin llamada HTTP)
  protected readonly motivosRechazo = this.masterData.motivosRechazo;

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly result = signal<Page<Contract> | null>(null);
  protected readonly page = signal(0);
  protected readonly size = signal(20);

  protected readonly createOpen = signal(false);
  protected readonly statusOpen = signal(false);
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly editingContract = signal<Contract | null>(null);

  // Búsqueda local contra el caché de IndexedDB — sin llamadas al backend
  protected readonly searchClientes = (q: string): Observable<RemoteOption[]> => {
    const query = q.trim().toLowerCase();
    const results = this.masterData
      .clientesActivos()
      .filter(
        (c) =>
          !query ||
          c.nombre.toLowerCase().includes(query) ||
          (c.nif?.toLowerCase().includes(query) ?? false),
      )
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .slice(0, 50)
      .map((c) => ({ id: c.id, label: c.nombre, sublabel: c.nif ?? undefined }));
    return of(results);
  };

  protected readonly searchSuministros = (q: string): Observable<RemoteOption[]> => {
    const query = q.trim().toLowerCase();
    const results = this.masterData
      .suministrosActivos()
      .filter(
        (s) =>
          !query ||
          s.cups.toLowerCase().includes(query) ||
          s.clienteNombre.toLowerCase().includes(query),
      )
      .sort((a, b) => a.cups.localeCompare(b.cups))
      .slice(0, 50)
      .map((s) => ({ id: s.id, label: s.cups, sublabel: s.clienteNombre }));
    return of(results);
  };

  protected readonly createForm = this.fb.nonNullable.group({
    clienteId: ['', [Validators.required]],
    suministroId: ['', [Validators.required]],
    servicio: [''],
    campana: [''],
    descuento: [null as number | null],
    estado: ['para_estudio' as ContractStatus],
    fechaInicio: [''],
    fechaFinPrevista: [''],
  });

  protected readonly statusForm = this.fb.nonNullable.group({
    estado: ['activo' as ContractStatus, [Validators.required]],
    fechaEstado: [''],
  });

  protected readonly rows = computed(() => this.result()?.content ?? []);
  protected readonly totalElements = computed(() => this.result()?.totalElements ?? 0);
  protected readonly totalPages = computed(() => this.result()?.totalPages ?? 0);

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
          status: this.statusFilter || undefined,
          q: this.q.trim() || undefined,
          startDate: this.startDate || undefined,
          endDate: this.endDate || undefined,
          motivoRechazo: this.motivoRechazo || undefined,
        },
        { page, size: this.size(), sort: 'fechaCreacion,desc' },
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

  protected onSizeChange(size: number): void {
    this.size.set(size);
    this.reload(0);
  }

  protected clearFilters(): void {
    this.q = '';
    this.statusFilter = '';
    this.motivoRechazo = '';
    this.startDate = '';
    this.endDate = '';
    this.reload(0);
  }

  // ── Crear contrato ──
  protected openCreate(): void {
    this.formError.set(null);
    this.createForm.reset({
      clienteId: '',
      suministroId: '',
      servicio: '',
      campana: '',
      descuento: null,
      estado: 'para_estudio',
      fechaInicio: '',
      fechaFinPrevista: '',
    });
    this.createOpen.set(true);
  }

  protected closeCreate(): void {
    this.createOpen.set(false);
  }

  protected submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    const v = this.createForm.getRawValue();
    this.submitting.set(true);
    this.formError.set(null);
    this.globalLoading.start('Guardando contrato', 'Registrando el nuevo contrato.');

    this.service
      .create({
        clienteId: v.clienteId,
        suministroId: v.suministroId,
        servicio: v.servicio || null,
        campana: v.campana || null,
        descuento: v.descuento,
        estado: v.estado || null,
        fechaInicio: v.fechaInicio || null,
        fechaFinPrevista: v.fechaFinPrevista || null,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.globalLoading.stop();
          this.closeCreate();
          this.notify.success('Contrato creado');
          this.reload(0);
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          this.globalLoading.stop();
          this.formError.set(extractMessage(err));
        },
      });
  }

  // ── Cambiar estado ──
  protected openStatus(contract: Contract): void {
    this.editingContract.set(contract);
    this.formError.set(null);
    this.statusForm.reset({
      estado: ASSIGNABLE_STATUSES.includes(contract.estado) ? contract.estado : 'activo',
      fechaEstado: '',
    });
    this.statusOpen.set(true);
  }

  protected closeStatus(): void {
    this.statusOpen.set(false);
    this.editingContract.set(null);
  }

  protected submitStatus(): void {
    const contract = this.editingContract();
    if (!contract || this.statusForm.invalid) {
      this.statusForm.markAllAsTouched();
      return;
    }
    const v = this.statusForm.getRawValue();
    this.submitting.set(true);
    this.formError.set(null);
    this.globalLoading.start('Actualizando estado', 'Cambiando el estado del contrato.');

    this.service
      .changeStatus(contract.id, { estado: v.estado, fechaEstado: v.fechaEstado || null })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.globalLoading.stop();
          this.closeStatus();
          this.notify.success(`Estado cambiado a "${CONTRACT_STATUS_LABEL[v.estado]}"`);
          this.reload(this.page());
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          this.globalLoading.stop();
          this.formError.set(extractMessage(err));
        },
      });
  }

  protected tone(status: ContractStatus): StatusTone {
    return STATUS_TONE[status];
  }

  protected scoringTone(score: number): 'success' | 'warning' | 'danger' {
    if (score <= 3) return 'success';
    if (score <= 6) return 'warning';
    return 'danger';
  }

  protected label(status: ContractStatus): string {
    return CONTRACT_STATUS_LABEL[status];
  }

  protected date(value: string | null): string {
    return formatDate(value);
  }

  protected text(value: string | null): string {
    return safeText(value);
  }

  protected euro(value: number | null): string {
    return formatEuro(value);
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
  return error.message || 'Error al cargar los contratos';
}
