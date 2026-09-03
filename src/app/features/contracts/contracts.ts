import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { PageHeader } from '../../shared/components/page-header/page-header';
import { StatusBadge, StatusTone } from '../../shared/components/status-badge/status-badge';
import { Pagination } from '../../shared/components/pagination/pagination';
import { TableSkeleton } from '../../shared/components/table-skeleton/table-skeleton';
import { LoadingOverlay } from '../../shared/components/loading-overlay/loading-overlay';
import { FormDialog } from '../../shared/components/form-dialog/form-dialog';
import { RemoteSelect, RemoteOption } from '../../shared/components/remote-select/remote-select';
import { Icon } from '../../shared/icons/icon';
import { BajaDialog } from '../../shared/components/baja-dialog/baja-dialog';
import { ContractService } from '../../core/services/contract.service';
import { MasterDataService } from '../../core/services/master-data.service';
import { GlobalLoadingService } from '../../core/services/global-loading.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { CustomerService } from '../../core/services/customer.service';
import { ContratoPdfService, PdfContratoData } from '../../core/services/contrato-pdf.service';
import { ListStateService }                    from '../../core/services/list-state.service';
import {
  ApiErrorResponse,
  Contract,
  ContractOffer,
  ContractOfferTarifa,
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
  rechazado: 'danger',
  incidencia: 'warning',
  desestimado: 'danger',
  anulado: 'neutral',
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
  'rechazado',
  'incidencia',
  'desestimado',
];

// ── PDF dialog models ─────────────────────────────────────────────────────────
interface OfertaPreciosTarifa {
  nombre: string;
  tipo: 'FIJO' | 'INDEXADO' | 'PASS_POOL';
  energia: (number | null)[];
  potencia: (number | null)[];
}
interface OfertaDlg {
  nombre: string;
  tipo: 'FIJO' | 'INDEXADO' | 'PASS_POOL';
  t20: OfertaPreciosTarifa;
  t30: OfertaPreciosTarifa;
  t61: OfertaPreciosTarifa;
}
function mkPrecios(): OfertaPreciosTarifa {
  return { nombre: '', tipo: 'FIJO', energia: [null, null, null, null, null, null], potencia: [null, null, null, null, null, null] };
}
function mkOferta(): OfertaDlg {
  return { nombre: '', tipo: 'FIJO', t20: mkPrecios(), t30: mkPrecios(), t61: mkPrecios() };
}

function dlgToContractOfertas(
  offers: OfertaDlg[], tar20: boolean, tar30: boolean, tar61: boolean,
): ContractOffer[] {
  const keys: { key: string; tar: 't20' | 't30' | 't61' }[] = [];
  if (tar20) keys.push({ key: '2.0TD', tar: 't20' });
  if (tar30) keys.push({ key: '3.0TD', tar: 't30' });
  if (tar61) keys.push({ key: '6.1TD', tar: 't61' });
  if (keys.length === 0) return [];
  return offers.map(o => ({
    nombreProducto: o.nombre || undefined,
    tipoOferta: o.tipo,
    tarifas: Object.fromEntries(keys.map(({ key, tar }) => {
      const p = o[tar];
      const t: ContractOfferTarifa = {
        nombre: p.nombre || undefined,
        tipo: p.tipo || undefined,
        energiaP1: p.energia[0] ?? undefined, energiaP2: p.energia[1] ?? undefined,
        energiaP3: p.energia[2] ?? undefined, energiaP4: p.energia[3] ?? undefined,
        energiaP5: p.energia[4] ?? undefined, energiaP6: p.energia[5] ?? undefined,
        potenciaP1: p.potencia[0] ?? undefined, potenciaP2: p.potencia[1] ?? undefined,
        potenciaP3: p.potencia[2] ?? undefined, potenciaP4: p.potencia[3] ?? undefined,
        potenciaP5: p.potencia[4] ?? undefined, potenciaP6: p.potencia[5] ?? undefined,
      };
      return [key, t];
    })),
  }));
}

function contractOfertasToDlg(offers: ContractOffer[]): OfertaDlg[] {
  return offers.map(o => {
    const t20 = mkPrecios(); const t30 = mkPrecios(); const t61 = mkPrecios();
    const fill = (t: OfertaPreciosTarifa, d: ContractOfferTarifa) => {
      t.nombre = d.nombre ?? '';
      t.tipo = (d.tipo ?? o.tipoOferta ?? 'FIJO') as 'FIJO' | 'INDEXADO' | 'PASS_POOL';
      t.energia = [d.energiaP1 ?? null, d.energiaP2 ?? null, d.energiaP3 ?? null,
                   d.energiaP4 ?? null, d.energiaP5 ?? null, d.energiaP6 ?? null];
      t.potencia = [d.potenciaP1 ?? null, d.potenciaP2 ?? null, d.potenciaP3 ?? null,
                    d.potenciaP4 ?? null, d.potenciaP5 ?? null, d.potenciaP6 ?? null];
    };
    if (o.tarifas?.['2.0TD']) fill(t20, o.tarifas['2.0TD']);
    if (o.tarifas?.['3.0TD']) fill(t30, o.tarifas['3.0TD']);
    if (o.tarifas?.['6.1TD']) fill(t61, o.tarifas['6.1TD']);
    return { nombre: o.nombreProducto ?? '', tipo: (o.tipoOferta ?? 'FIJO') as 'FIJO'|'INDEXADO'|'PASS_POOL', t20, t30, t61 };
  });
}

function contractOffersToPdfOfertas(offers: ContractOffer[]) {
  return offers.map(o => ({
    nombre_producto: o.nombreProducto ?? undefined,
    tipo_oferta: o.tipoOferta ?? undefined,
    tarifas: o.tarifas
      ? Object.fromEntries(Object.entries(o.tarifas).map(([k, t]) => [k, {
          nombre: t.nombre ?? undefined,
          tipo: t.tipo ?? undefined,
          energia_p1: t.energiaP1 ?? undefined, energia_p2: t.energiaP2 ?? undefined,
          energia_p3: t.energiaP3 ?? undefined, energia_p4: t.energiaP4 ?? undefined,
          energia_p5: t.energiaP5 ?? undefined, energia_p6: t.energiaP6 ?? undefined,
          potencia_p1: t.potenciaP1 ?? undefined, potencia_p2: t.potenciaP2 ?? undefined,
          potencia_p3: t.potenciaP3 ?? undefined, potencia_p4: t.potenciaP4 ?? undefined,
          potencia_p5: t.potenciaP5 ?? undefined, potencia_p6: t.potenciaP6 ?? undefined,
        }]))
      : {},
  }));
}

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
    BajaDialog,
  ],
  templateUrl: './contracts.html',
})
export class Contracts implements OnDestroy {
  private readonly service = inject(ContractService);
  private readonly masterData = inject(MasterDataService);
  private readonly globalLoading = inject(GlobalLoadingService);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);
  private readonly customerService = inject(CustomerService);
  private readonly pdfService = inject(ContratoPdfService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly listState = inject(ListStateService);

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

  protected readonly createOpen    = signal(false);
  protected readonly statusOpen    = signal(false);
  protected readonly editOpen      = signal(false);
  protected readonly bajaDialogOpen   = signal(false);
  protected readonly bajaForContract  = signal<Contract | null>(null);
  protected readonly bajaFechaInicial = signal('');
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly editingContract = signal<Contract | null>(null);
  protected readonly selectedFiles = signal<File[]>([]);

  // Motivo KO en diálogo de cambio de estado
  protected readonly motivoKoSelectVal = signal('');
  protected readonly motivoKoAdding = signal(false);
  protected readonly motivoKoNewText = signal('');

  // Motivo KO en formulario de edición
  protected readonly editMotivoKoSelectVal = signal('');
  protected readonly editMotivoKoAdding = signal(false);
  protected readonly editMotivoKoNewText = signal('');

  // PDF — descarga directa usando ofertas guardadas en el contrato
  protected readonly descargandoPdf = signal<string | null>(null);
  /** ID del contrato que se está renovando — si está presente, el submit llama a renovar() en vez de update() */
  protected readonly renovandoId = signal<string | null>(null);
  protected readonly isReadOnly = computed(() => this.editingContract()?.estado === 'renovado');
  protected readonly isRenovando = computed(() => !!this.renovandoId());
  protected readonly editTab = signal<'form' | 'info'>('form');

  // Ofertas en formulario de creación/edición (compartido, no pueden estar abiertos a la vez)
  protected readonly fOfertaTar20 = signal(false);
  protected readonly fOfertaTar30 = signal(false);
  protected readonly fOfertaTar61 = signal(false);
  protected readonly fOfertas = signal<OfertaDlg[]>([mkOferta()]);

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
    motivoRechazo: this.fb.nonNullable.control(''),
  });

  protected readonly editEstado = toSignal(
    this.editForm.controls.estado.valueChanges,
    { initialValue: this.editForm.controls.estado.value },
  );

  protected readonly statusForm = this.fb.nonNullable.group({
    estado: ['activo' as ContractStatus, [Validators.required]],
    fechaEstado: [''],
    motivoRechazo: [''],
  });

  protected readonly statusEstado = toSignal(
    this.statusForm.controls.estado.valueChanges,
    { initialValue: this.statusForm.controls.estado.value },
  );

  protected readonly rows = computed(() => this.result()?.content ?? []);
  protected readonly totalElements = computed(() => this.result()?.totalElements ?? 0);
  protected readonly totalPages = computed(() => this.result()?.totalPages ?? 0);

  protected readonly sortField = signal('fechaCreacion');
  protected readonly sortDir   = signal<'asc' | 'desc'>('desc');

  protected setSort(field: string): void {
    if (this.sortField() === field) {
      this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDir.set('asc');
    }
    this.reload(0);
  }

  constructor() {
    const s = this.listState.get<{ q: string; statusFilter: string; startDate: string; endDate: string; motivoRechazo: string; page: number; size: number; sortField: string; sortDir: 'asc' | 'desc' }>('contracts');
    if (s) {
      this.q = s.q;
      this.statusFilter = s.statusFilter as ContractStatus | '';
      this.startDate = s.startDate;
      this.endDate = s.endDate;
      this.motivoRechazo = s.motivoRechazo;
      this.size.set(s.size);
      if (s.sortField) this.sortField.set(s.sortField);
      if (s.sortDir)   this.sortDir.set(s.sortDir);
    }

    // Pre-populate filters from query params (e.g. when coming from the dashboard chart)
    const snap = this.route.snapshot.queryParams;
    const snapStatus = snap['status'] as ContractStatus | undefined;
    const snapMotivo = snap['motivoRechazo'] as string | undefined;
    if (snapStatus) this.statusFilter = snapStatus;
    if (snapMotivo) this.motivoRechazo = snapMotivo;
    if (snapStatus || snapMotivo) {
      void this.router.navigate([], { replaceUrl: true, queryParams: {} });
    }

    this.reload(snapStatus || snapMotivo ? 0 : (s?.page ?? 0));

    // Reactive handler for id/renovar deep-links (can arrive after init)
    this.route.queryParams.subscribe(params => {
      const id = params['id'] as string | undefined;
      const renovar = params['renovar'] as string | undefined;
      if (id || renovar) {
        void this.router.navigate([], { replaceUrl: true, queryParams: {} });
        this.service.getById((id ?? renovar)!).subscribe({
          next: (c) => {
            if (renovar) {
              this.renovandoId.set(renovar);
            }
            this.openEdit(c);
          },
          error: () => {},
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.listState.save('contracts', {
      q: this.q, statusFilter: this.statusFilter, startDate: this.startDate,
      endDate: this.endDate, motivoRechazo: this.motivoRechazo,
      page: this.page(), size: this.size(),
      sortField: this.sortField(), sortDir: this.sortDir(),
    });
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
        { page, size: this.size(), sort: `${this.sortField()},${this.sortDir()}` },
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
    this.fOfertaTar20.set(false);
    this.fOfertaTar30.set(false);
    this.fOfertaTar61.set(false);
    this.fOfertas.set([mkOferta()]);
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
        ofertas: dlgToContractOfertas(this.fOfertas(), this.fOfertaTar20(), this.fOfertaTar30(), this.fOfertaTar61()),
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
    this.editTab.set('form');
    this.editingContract.set(contract);
    this.formError.set(null);
    const motivo = contract.motivoRechazo ?? '';
    if (motivo && !this.masterData.motivosRechazo().includes(motivo)) {
      this.masterData.mergeMotivos([motivo]);
    }
    this.editMotivoKoSelectVal.set(motivo);
    this.editMotivoKoAdding.set(false);
    this.editMotivoKoNewText.set('');
    this.editForm.patchValue({
      servicio: contract.servicio ?? '',
      campana: contract.campana ?? '',
      descuento: contract.descuento,
      estado: contract.estado,
      fechaInicio: contract.fechaInicio ?? '',
      fechaFinPrevista: contract.fechaFinPrevista ?? '',
      motivoRechazo: motivo,
    });
    const savedOfertas = contract.ofertas ?? [];
    if (savedOfertas.length > 0) {
      this.fOfertas.set(contractOfertasToDlg(savedOfertas));
      this.fOfertaTar20.set(savedOfertas.some(o => !!o.tarifas?.['2.0TD']));
      this.fOfertaTar30.set(savedOfertas.some(o => !!o.tarifas?.['3.0TD']));
      this.fOfertaTar61.set(savedOfertas.some(o => !!o.tarifas?.['6.1TD']));
    } else {
      this.fOfertas.set([mkOferta()]);
      this.fOfertaTar20.set(false);
      this.fOfertaTar30.set(false);
      this.fOfertaTar61.set(false);
    }
    // Read-only when renovado or when opening to confirm a renovation
    if (contract.estado === 'renovado' || this.renovandoId()) {
      this.editForm.disable();
    } else {
      this.editForm.enable();
    }
    this.editOpen.set(true);
  }

  protected closeEdit(): void {
    this.editOpen.set(false);
    this.editingContract.set(null);
    this.renovandoId.set(null);
    this.editMotivoKoSelectVal.set('');
    this.editMotivoKoAdding.set(false);
    this.editMotivoKoNewText.set('');
  }

  protected verContrato(id: string): void {
    this.closeEdit();
    void this.router.navigate(['/contracts'], { queryParams: { id } });
  }

  protected toggleValidado(row: Contract, event: MouseEvent): void {
    event.stopPropagation();
    this.service.toggleValidado(row.id).subscribe({
      next: (updated) => {
        this.result.update(r => r ? {
          ...r,
          content: r.content.map(c => c.id === updated.id ? { ...c, validado: updated.validado } : c),
        } : r);
      },
      error: () => this.notify.error('No se pudo cambiar el estado de validación'),
    });
  }

  protected submitEdit(): void {
    const contract = this.editingContract();
    if (!contract) return;

    const renovarId = this.renovandoId();
    if (renovarId) {
      this.submitting.set(true);
      this.formError.set(null);
      this.globalLoading.start('Renovando contrato', 'Creando el nuevo contrato…');
      this.service.renovar(renovarId).subscribe({
        next: (nuevo) => {
          this.submitting.set(false);
          this.globalLoading.stop();
          this.closeEdit();
          this.notify.success('Contrato renovado correctamente');
          this.reload(this.page());
          void this.router.navigate(['/contracts'], { queryParams: { id: nuevo.id } });
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          this.globalLoading.stop();
          this.formError.set(extractMessage(err));
        },
      });
      return;
    }

    if (this.editForm.invalid) {
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
        motivoRechazo: v.estado === 'ko' ? (v.motivoRechazo || null) : null,
        fechaInicio: v.fechaInicio || null,
        fechaFinPrevista: v.fechaFinPrevista || null,
        ofertas: dlgToContractOfertas(this.fOfertas(), this.fOfertaTar20(), this.fOfertaTar30(), this.fOfertaTar61()),
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

  protected closeBajaDialog(): void {
    this.bajaDialogOpen.set(false);
    this.bajaForContract.set(null);
  }

  protected onBajaSaved(): void {
    this.closeBajaDialog();
    this.reload(this.page());
  }

  protected onEditEstadoChange(estado: string): void {
    if (estado === 'baja') {
      const contract = this.editingContract();
      if (contract) {
        this.closeEdit();
        this.bajaForContract.set(contract);
        this.bajaDialogOpen.set(true);
      }
    }
  }

  protected onMotivoKoSelect(val: string): void {
    this.motivoKoSelectVal.set(val);
    this.statusForm.patchValue({ motivoRechazo: val });
  }

  protected onEditMotivoKoSelect(val: string): void {
    this.editMotivoKoSelectVal.set(val);
    this.editForm.patchValue({ motivoRechazo: val });
  }

  protected confirmEditMotivoKoNew(): void {
    const text = this.editMotivoKoNewText().trim();
    if (!text) return;
    this.masterData.mergeMotivos([text]);
    this.editMotivoKoSelectVal.set(text);
    this.editForm.patchValue({ motivoRechazo: text });
    this.editMotivoKoAdding.set(false);
    this.editMotivoKoNewText.set('');
  }

  protected cancelEditMotivoKoNew(): void {
    this.editMotivoKoAdding.set(false);
    this.editMotivoKoNewText.set('');
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

    if (v.estado === 'baja') {
      this.closeStatus();
      this.bajaForContract.set(contract);
      this.bajaFechaInicial.set(v.fechaEstado ?? '');
      this.bajaDialogOpen.set(true);
      return;
    }

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

  protected consumo(value: number | null): string {
    if (value == null || value === 0) return '—';
    return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
  }

  protected euro(value: number | null): string {
    return formatEuro(value);
  }

  // ── Ofertas (formulario compartido crear/editar) ────────────────────────────
  protected fAgregarOferta(): void {
    this.fOfertas.update(list => [...list, mkOferta()]);
  }

  protected fEliminarOferta(i: number): void {
    this.fOfertas.update(list => list.filter((_, j) => j !== i));
  }

  protected fSetTarNombre(i: number, tar: 't20' | 't30' | 't61', v: string): void {
    this.fOfertas.update(list => list.map((o, j) => j === i ? { ...o, [tar]: { ...o[tar], nombre: v } } : o));
  }

  protected fSetTarTipo(i: number, tar: 't20' | 't30' | 't61', v: 'FIJO' | 'INDEXADO' | 'PASS_POOL'): void {
    this.fOfertas.update(list => list.map((o, j) => j === i ? { ...o, [tar]: { ...o[tar], tipo: v } } : o));
  }

  protected fSetPrecio(oi: number, tar: 't20' | 't30' | 't61', tipo: 'energia' | 'potencia', pi: number, v: string): void {
    const raw = parseFloat(v);
    const val: number | null = v === '' || Number.isNaN(raw) ? null : raw;
    this.fOfertas.update(list =>
      list.map((o, j) => {
        if (j !== oi) return o;
        const bloque = { ...o[tar] };
        const arr = [...bloque[tipo]];
        arr[pi] = val;
        return { ...o, [tar]: { ...bloque, [tipo]: arr } };
      }),
    );
  }

  // ── Anular contrato (soft delete) ──────────────────────────────────────────
  protected async confirmAnular(row: Contract): Promise<void> {
    const ok = await this.confirm.ask({
      header: 'Anular contrato',
      message: `¿Anular el contrato de <b>${row.clienteNombre ?? row.idExterno ?? row.id}</b>? Pasará a estado <b>Anulado</b>.`,
      acceptLabel: 'Sí, anular',
      rejectLabel: 'Cancelar',
      variant: 'danger',
    });
    if (!ok) return;
    this.globalLoading.start('Anulando contrato', 'Cambiando el estado del contrato.');
    this.service.changeStatus(row.id, { estado: 'anulado' }).subscribe({
      next: () => {
        this.globalLoading.stop();
        this.notify.success('Contrato anulado');
        this.reload(this.page());
      },
      error: (err: HttpErrorResponse) => {
        this.globalLoading.stop();
        this.notify.error(extractMessage(err));
      },
    });
  }

  // ── Descarga PDF (usa ofertas guardadas en el contrato) ─────────────────────
  protected descargarPdf(contrato: Contract): void {
    if (this.descargandoPdf()) return;
    this.descargandoPdf.set(contrato.id);
    const ofertas = contractOffersToPdfOfertas(contrato.ofertas ?? []);

    const run = (base: PdfContratoData) =>
      this.pdfService.generarPdf({ ...base, ofertas })
        .catch(err => { console.error('Error generando PDF:', err); this.notify.error('Error al generar el PDF'); })
        .finally(() => { this.descargandoPdf.set(null); });

    this.customerService.getById(contrato.clienteId).subscribe({
      next: (cliente) => run({
        id_propuesta:           contrato.idExterno ?? undefined,
        fecha_contrato:         contrato.fechaEstado ?? contrato.fechaCreacion ?? undefined,
        nombre_cliente:         contrato.clienteNombre,
        cif:                    contrato.clienteNif ?? undefined,
        cnae:                   cliente.cnae ?? undefined,
        telefono:               cliente.telefono ?? undefined,
        correo:                 cliente.email ?? undefined,
        representante_legal:    cliente.titular ?? undefined,
        numero_cuenta_bancaria: cliente.iban ?? undefined,
        cups:                   contrato.cups ? [contrato.cups] : undefined,
        tarifa:                 contrato.suministroTarifa ?? undefined,
        provincia:              contrato.provincia ?? undefined,
      }),
      error: () => run({
        id_propuesta:   contrato.idExterno ?? undefined,
        fecha_contrato: contrato.fechaEstado ?? contrato.fechaCreacion ?? undefined,
        nombre_cliente: contrato.clienteNombre,
        cif:            contrato.clienteNif ?? undefined,
        cups:           contrato.cups ? [contrato.cups] : undefined,
        tarifa:         contrato.suministroTarifa ?? undefined,
        provincia:      contrato.provincia ?? undefined,
      }),
    });
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
