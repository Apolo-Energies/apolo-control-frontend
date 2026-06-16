import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

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
  SuministroPayload,
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
  protected readonly editOpen = signal(false);
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly editingContract = signal<Contract | null>(null);
  protected readonly selectedFiles = signal<File[]>([]);

  // Motivo KO: select + añadir nuevo
  protected readonly motivoKoSelectVal = signal('');
  protected readonly motivoKoAdding = signal(false);
  protected readonly motivoKoNewText = signal('');

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

  protected readonly createForm = this.fb.group({
    clienteId: this.fb.nonNullable.control('', [Validators.required]),
    suministros: this.fb.array([
      this.fb.group({
        mode: this.fb.nonNullable.control<'existing' | 'new'>('existing'),
        id: this.fb.nonNullable.control(''),
        cups: this.fb.nonNullable.control(''),
        tipo: this.fb.nonNullable.control<'E' | 'G' | ''>(''),
        tarifa: this.fb.nonNullable.control(''),
        compra: this.fb.nonNullable.control(false),
        consumoContrato: this.fb.control<number | null>(null),
        consumoUltimos12Meses: this.fb.control<number | null>(null),
        direccion: this.fb.nonNullable.control(''),
        codigoPostal: this.fb.nonNullable.control(''),
        ineProvincia: this.fb.nonNullable.control(''),
        provincia: this.fb.nonNullable.control(''),
        inePoblacion: this.fb.nonNullable.control(''),
        poblacion: this.fb.nonNullable.control(''),
        dirFacturacion: this.fb.nonNullable.control(''),
        cpFacturacion: this.fb.nonNullable.control(''),
        ineProvFacturacion: this.fb.nonNullable.control(''),
        provFacturacion: this.fb.nonNullable.control(''),
        inePobFacturacion: this.fb.nonNullable.control(''),
        pobFacturacion: this.fb.nonNullable.control(''),
        potenciaP1: this.fb.control<number | null>(null),
        potenciaP2: this.fb.control<number | null>(null),
        potenciaP3: this.fb.control<number | null>(null),
        potenciaP4: this.fb.control<number | null>(null),
        potenciaP5: this.fb.control<number | null>(null),
        potenciaP6: this.fb.control<number | null>(null),
      }),
    ]),
    servicio: this.fb.nonNullable.control(''),
    campana: this.fb.nonNullable.control(''),
    descuento: this.fb.control<number | null>(null),
    estado: this.fb.nonNullable.control<ContractStatus>('para_estudio'),
    fechaInicio: this.fb.nonNullable.control(''),
    fechaFinPrevista: this.fb.nonNullable.control(''),
  });

  private readonly suministroVersion = signal(0);

  protected readonly suministroControls = computed((): FormGroup[] => {
    this.suministroVersion();
    return (this.createForm.get('suministros') as FormArray).controls as FormGroup[];
  });

  protected readonly editForm = this.fb.group({
    servicio: this.fb.nonNullable.control(''),
    campana: this.fb.nonNullable.control(''),
    descuento: this.fb.control<number | null>(null),
    estado: this.fb.nonNullable.control<ContractStatus>('para_estudio'),
    fechaInicio: this.fb.nonNullable.control(''),
    fechaFinPrevista: this.fb.nonNullable.control(''),
  });

  protected readonly statusForm = this.fb.nonNullable.group({
    estado: ['activo' as ContractStatus, [Validators.required]],
    fechaEstado: [''],
    motivoRechazo: [''],
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
    const arr = this.createForm.get('suministros') as FormArray;
    while (arr.length > 0) arr.removeAt(0);
    arr.push(this.makeSuministroGroup());
    this.suministroVersion.set(1);
    this.createForm.patchValue({
      clienteId: '',
      servicio: '',
      campana: '',
      descuento: null,
      estado: 'para_estudio' as ContractStatus,
      fechaInicio: '',
      fechaFinPrevista: '',
    });
    this.createForm.markAsPristine();
    this.createForm.markAsUntouched();
    this.selectedFiles.set([]);
    this.createOpen.set(true);
  }

  protected addSuministro(): void {
    (this.createForm.get('suministros') as FormArray).push(this.makeSuministroGroup());
    this.suministroVersion.update(v => v + 1);
  }

  protected removeSuministro(index: number): void {
    const arr = this.createForm.get('suministros') as FormArray;
    if (arr.length > 1) {
      arr.removeAt(index);
      this.suministroVersion.update(v => v + 1);
    }
  }

  protected closeCreate(): void {
    this.selectedFiles.set([]);
    this.createOpen.set(false);
  }

  protected onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.selectedFiles.update(files => [...files, ...Array.from(input.files!)]);
    input.value = '';
  }

  protected removeFile(index: number): void {
    this.selectedFiles.update(files => files.filter((_, i) => i !== index));
  }

  protected formatFileSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  protected submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    const v = this.createForm.getRawValue();
    const rawRows = (this.createForm.get('suministros') as FormArray).getRawValue() as Array<{
      mode: 'existing' | 'new';
      id: string;
      cups: string; tipo: string; tarifa: string; compra: boolean;
      consumoContrato: number | null; consumoUltimos12Meses: number | null;
      direccion: string; codigoPostal: string;
      ineProvincia: string; provincia: string; inePoblacion: string; poblacion: string;
      dirFacturacion: string; cpFacturacion: string;
      ineProvFacturacion: string; provFacturacion: string;
      inePobFacturacion: string; pobFacturacion: string;
      potenciaP1: number | null; potenciaP2: number | null; potenciaP3: number | null;
      potenciaP4: number | null; potenciaP5: number | null; potenciaP6: number | null;
    }>;
    const suministros: SuministroPayload[] = rawRows
      .map((s): SuministroPayload | null => {
        if (s.mode === 'existing') return s.id ? { id: s.id } : null;
        if (!s.cups) return null;
        return {
          cups: s.cups,
          tipo: (s.tipo as 'E' | 'G') || undefined,
          tarifa: s.tarifa || undefined,
          compra: s.compra || undefined,
          consumoContrato: s.consumoContrato ?? undefined,
          consumoUltimos12Meses: s.consumoUltimos12Meses ?? undefined,
          direccion: s.direccion || undefined,
          codigoPostal: s.codigoPostal || undefined,
          ineProvincia: s.ineProvincia || undefined,
          provincia: s.provincia || undefined,
          inePoblacion: s.inePoblacion || undefined,
          poblacion: s.poblacion || undefined,
          dirFacturacion: s.dirFacturacion || undefined,
          cpFacturacion: s.cpFacturacion || undefined,
          ineProvFacturacion: s.ineProvFacturacion || undefined,
          provFacturacion: s.provFacturacion || undefined,
          inePobFacturacion: s.inePobFacturacion || undefined,
          pobFacturacion: s.pobFacturacion || undefined,
          potenciaP1: s.potenciaP1 ?? undefined,
          potenciaP2: s.potenciaP2 ?? undefined,
          potenciaP3: s.potenciaP3 ?? undefined,
          potenciaP4: s.potenciaP4 ?? undefined,
          potenciaP5: s.potenciaP5 ?? undefined,
          potenciaP6: s.potenciaP6 ?? undefined,
        };
      })
      .filter((s): s is SuministroPayload => s !== null);

    this.submitting.set(true);
    this.formError.set(null);
    this.globalLoading.start('Guardando contrato', 'Registrando el nuevo contrato.');

    this.service
      .create({
        clienteId: v.clienteId,
        suministros: suministros.length > 0 ? suministros : undefined,
        servicio: v.servicio || null,
        campana: v.campana || null,
        descuento: v.descuento,
        estado: v.estado || null,
        fechaInicio: v.fechaInicio || null,
        fechaFinPrevista: v.fechaFinPrevista || null,
      }, this.selectedFiles())
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

  // ── Editar contrato ──
  protected openEdit(contract: Contract): void {
    this.editingContract.set(contract);
    this.formError.set(null);
    this.editForm.patchValue({
      servicio: contract.servicio ?? '',
      campana: contract.campana ?? '',
      descuento: contract.descuento,
      estado: contract.estado,
      fechaInicio: contract.fechaInicio ?? '',
      fechaFinPrevista: contract.fechaFinPrevista ?? '',
    });
    this.editOpen.set(true);
  }

  protected closeEdit(): void {
    this.editOpen.set(false);
    this.editingContract.set(null);
  }

  protected submitEdit(): void {
    const contract = this.editingContract();
    if (!contract || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const v = this.editForm.getRawValue();
    this.submitting.set(true);
    this.formError.set(null);
    this.globalLoading.start('Guardando contrato', 'Actualizando el contrato.');

    this.service
      .update(contract.id, {
        clienteId: contract.clienteId,
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
          this.closeEdit();
          this.notify.success('Contrato actualizado');
          this.reload(this.page());
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
    const motivo = contract.motivoRechazo ?? '';
    // Si el motivo guardado no está en la lista local, lo añadimos para que aparezca en el select
    if (motivo && !this.masterData.motivosRechazo().includes(motivo)) {
      this.masterData.mergeMotivos([motivo]);
    }
    this.motivoKoSelectVal.set(motivo);
    this.motivoKoAdding.set(false);
    this.motivoKoNewText.set('');
    this.statusForm.reset({
      estado: ASSIGNABLE_STATUSES.includes(contract.estado) ? contract.estado : 'activo',
      fechaEstado: '',
      motivoRechazo: motivo,
    });
    this.statusOpen.set(true);
  }

  protected closeStatus(): void {
    this.statusOpen.set(false);
    this.editingContract.set(null);
    this.motivoKoSelectVal.set('');
    this.motivoKoAdding.set(false);
    this.motivoKoNewText.set('');
  }

  protected onMotivoKoSelect(val: string): void {
    this.motivoKoSelectVal.set(val);
    this.statusForm.patchValue({ motivoRechazo: val });
  }

  protected confirmMotivoKoNew(): void {
    const text = this.motivoKoNewText().trim();
    if (!text) return;
    this.masterData.mergeMotivos([text]);
    this.motivoKoSelectVal.set(text);
    this.statusForm.patchValue({ motivoRechazo: text });
    this.motivoKoAdding.set(false);
    this.motivoKoNewText.set('');
  }

  protected cancelMotivoKoNew(): void {
    this.motivoKoAdding.set(false);
    this.motivoKoNewText.set('');
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
      .changeStatus(contract.id, {
        estado: v.estado,
        fechaEstado: v.fechaEstado || null,
        motivoRechazo: v.estado === 'ko' ? (v.motivoRechazo || null) : null,
      })
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

  protected makeSuministroGroup(): FormGroup {
    return this.fb.group({
      mode: this.fb.nonNullable.control<'existing' | 'new'>('existing'),
      // existente
      id: this.fb.nonNullable.control(''),
      // nuevo — datos básicos
      cups: this.fb.nonNullable.control(''),
      tipo: this.fb.nonNullable.control<'E' | 'G' | ''>(''),
      tarifa: this.fb.nonNullable.control(''),
      compra: this.fb.nonNullable.control(false),
      consumoContrato: this.fb.control<number | null>(null),
      consumoUltimos12Meses: this.fb.control<number | null>(null),
      // nuevo — ubicación
      direccion: this.fb.nonNullable.control(''),
      codigoPostal: this.fb.nonNullable.control(''),
      ineProvincia: this.fb.nonNullable.control(''),
      provincia: this.fb.nonNullable.control(''),
      inePoblacion: this.fb.nonNullable.control(''),
      poblacion: this.fb.nonNullable.control(''),
      // nuevo — facturación
      dirFacturacion: this.fb.nonNullable.control(''),
      cpFacturacion: this.fb.nonNullable.control(''),
      ineProvFacturacion: this.fb.nonNullable.control(''),
      provFacturacion: this.fb.nonNullable.control(''),
      inePobFacturacion: this.fb.nonNullable.control(''),
      pobFacturacion: this.fb.nonNullable.control(''),
      // nuevo — potencias
      potenciaP1: this.fb.control<number | null>(null),
      potenciaP2: this.fb.control<number | null>(null),
      potenciaP3: this.fb.control<number | null>(null),
      potenciaP4: this.fb.control<number | null>(null),
      potenciaP5: this.fb.control<number | null>(null),
      potenciaP6: this.fb.control<number | null>(null),
    });
  }

  protected setSuministroMode(grp: FormGroup, mode: 'existing' | 'new'): void {
    grp.get('mode')!.setValue(mode);
    this.suministroVersion.update(v => v + 1);
  }

  protected asControl(ctrl: AbstractControl | null): FormControl {
    return ctrl as FormControl;
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
