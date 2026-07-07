import {
  ChangeDetectionStrategy, Component, computed, inject, signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { of } from 'rxjs';

import { PageHeader } from '../../shared/components/page-header/page-header';
import { TableSkeleton } from '../../shared/components/table-skeleton/table-skeleton';
import { StatusBadge, StatusTone } from '../../shared/components/status-badge/status-badge';
import { Pagination } from '../../shared/components/pagination/pagination';
import { FormDialog } from '../../shared/components/form-dialog/form-dialog';
import { RemoteSelect, RemoteOption } from '../../shared/components/remote-select/remote-select';
import { Icon } from '../../shared/icons/icon';
import { CambioService } from '../../core/services/cambio.service';
import { MasterDataService } from '../../core/services/master-data.service';
import { NotificationService } from '../../core/services/notification.service';
import { GlobalLoadingService } from '../../core/services/global-loading.service';
import { ConfirmService } from '../../core/services/confirm.service';
import {
  Cambio, TipoCambio, ResultadoCambio,
  TIPO_CAMBIO_LABEL, RESULTADO_CAMBIO_LABEL,
  TIPO_CAMBIO_VALUES, RESULTADO_CAMBIO_VALUES,
} from '../../core/models/cambio.model';
import { Page } from '../../core/models';
import { formatDate } from '../../shared/utils/format';

const RESULTADO_TONE: Record<ResultadoCambio, StatusTone> = {
  activo:          'success',
  rechazado:       'danger',
  en_tramite:      'warning',
  enviado_a_firma: 'info',
  cerrada:         'neutral',
  doc_firmada:     'purple',
};

const TIPO_TONE: Record<TipoCambio, StatusTone> = {
  cambio_potencia:        'info',
  cambio_titularidad:     'purple',
  cambio_cuenta_bancaria: 'warning',
  cambio_oferta:          'neutral',
  baja_por_cese:          'danger',
  otra:                   'neutral',
};

function extractMessage(err: HttpErrorResponse): string {
  return (err.error as { message?: string })?.message ?? err.message ?? 'Error inesperado';
}

@Component({
  selector: 'app-cambios',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeader, TableSkeleton, StatusBadge, Pagination, FormDialog,
    RemoteSelect, Icon, FormsModule, ReactiveFormsModule,
  ],
  templateUrl: './cambios.html',
})
export class Cambios {
  private readonly service = inject(CambioService);
  private readonly masterData = inject(MasterDataService);
  private readonly notify = inject(NotificationService);
  private readonly globalLoading = inject(GlobalLoadingService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);

  // ── List state ────────────────────────────────────────────────────────────
  protected readonly loading = signal(false);
  protected readonly result = signal<Page<Cambio> | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly page = signal(0);
  protected readonly size = signal(20);

  // ── Filters ───────────────────────────────────────────────────────────────
  protected q = '';
  protected tipoFilter: TipoCambio | '' = '';
  protected resultadoFilter: ResultadoCambio | '' = '';
  protected gestionadoFilter: '' | 'true' | 'false' = '';

  // ── Cliente search (local, sobre master-data) ─────────────────────────────
  protected readonly selectedClienteOption = signal<RemoteOption | null>(null);

  protected readonly searchClientes = (q: string) => {
    const clients = this.masterData.clientesActivos();
    const ql = q.toLowerCase();
    const filtered = ql
      ? clients.filter(c =>
          c.nombre.toLowerCase().includes(ql) ||
          (c.nif?.toLowerCase().includes(ql) ?? false))
      : clients;
    return of(
      filtered
        .slice(0, 60)
        .map(c => ({ id: c.id, label: c.nombre, sublabel: c.nif ?? undefined } as RemoteOption))
    );
  };

  // ── Constants ─────────────────────────────────────────────────────────────
  protected readonly tipoValues = TIPO_CAMBIO_VALUES;
  protected readonly resultadoValues = RESULTADO_CAMBIO_VALUES;
  protected readonly tipoLabel = TIPO_CAMBIO_LABEL;
  protected readonly resultadoLabel = RESULTADO_CAMBIO_LABEL;
  protected readonly resultadoTone = RESULTADO_TONE;
  protected readonly tipoTone = TIPO_TONE;
  protected readonly formatDate = formatDate;

  protected readonly rows = computed(() => this.result()?.content ?? []);
  protected readonly totalElements = computed(() => this.result()?.totalElements ?? 0);
  protected readonly totalPages = computed(() => this.result()?.totalPages ?? 0);

  // ── Dialog ────────────────────────────────────────────────────────────────
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<Cambio | null>(null);
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.fb.group({
    clienteId:               [null as string | null],
    clienteNombre:           ['', Validators.required],
    cups:                    [''],
    tipoSolicitud:           ['', Validators.required],
    resultado:               [''],
    gestionado:              [false],
    fechaSolicitud:          [''],
    fechaEnvioDocumentacion: [''],
    fechaDocumentoFirma:     [''],
    fechaActivo:             [''],
    comentarios:             [''],
  });

  constructor() {
    // Whenever clienteId changes, auto-fill clienteNombre from master-data
    this.form.get('clienteId')!.valueChanges.subscribe(id => {
      if (id) {
        const client = this.masterData.clientesActivos().find(c => c.id === id);
        if (client) {
          this.form.patchValue({ clienteNombre: client.nombre }, { emitEvent: false });
          this.selectedClienteOption.set({ id: client.id, label: client.nombre, sublabel: client.nif ?? undefined });
        }
      } else {
        this.form.patchValue({ clienteNombre: '' }, { emitEvent: false });
        this.selectedClienteOption.set(null);
      }
    });
    this.reload(0);
  }

  // ── List ──────────────────────────────────────────────────────────────────
  protected reload(p: number): void {
    this.page.set(p);
    this.loading.set(true);
    this.service.list({
      q:            this.q || undefined,
      tipoSolicitud: this.tipoFilter     || undefined,
      resultado:    this.resultadoFilter || undefined,
      gestionado:   this.gestionadoFilter ? this.gestionadoFilter === 'true' : undefined,
      page:         p,
      size:         this.size(),
    }).subscribe({
      next: (res) => { this.result.set(res); this.loading.set(false); },
      error: (err: HttpErrorResponse) => { this.error.set(extractMessage(err)); this.loading.set(false); },
    });
  }

  protected onSizeChange(size: number): void { this.size.set(size); this.reload(0); }
  protected applyFilters(): void { this.reload(0); }
  protected clearFilters(): void {
    this.q = ''; this.tipoFilter = ''; this.resultadoFilter = ''; this.gestionadoFilter = '';
    this.reload(0);
  }

  // ── Create ────────────────────────────────────────────────────────────────
  protected openCreate(): void {
    this.editing.set(null);
    this.formError.set(null);
    this.selectedClienteOption.set(null);
    this.form.reset({ gestionado: false });
    this.dialogOpen.set(true);
  }

  // ── Edit ──────────────────────────────────────────────────────────────────
  protected openEdit(row: Cambio): void {
    this.editing.set(row);
    this.formError.set(null);
    const clienteOption: RemoteOption | null = row.clienteId
      ? { id: row.clienteId, label: row.clienteNombre, sublabel: row.clienteNif ?? undefined }
      : null;
    this.selectedClienteOption.set(clienteOption);
    this.form.patchValue({
      clienteId:               row.clienteId ?? null,
      clienteNombre:           row.clienteNombre,
      cups:                    row.cups ?? '',
      tipoSolicitud:           row.tipoSolicitud,
      resultado:               row.resultado ?? '',
      gestionado:              row.gestionado,
      fechaSolicitud:          row.fechaSolicitud ?? '',
      fechaEnvioDocumentacion: row.fechaEnvioDocumentacion ?? '',
      fechaDocumentoFirma:     row.fechaDocumentoFirma ?? '',
      fechaActivo:             row.fechaActivo ?? '',
      comentarios:             row.comentarios ?? '',
    });
    this.dialogOpen.set(true);
  }

  protected closeDialog(): void { this.dialogOpen.set(false); this.editing.set(null); }

  protected submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const payload = {
      clienteId:               v.clienteId || null,
      clienteNombre:           v.clienteNombre!,
      cups:                    v.cups || null,
      tipoSolicitud:           v.tipoSolicitud as TipoCambio,
      resultado:               (v.resultado as ResultadoCambio) || null,
      gestionado:              v.gestionado ?? false,
      fechaSolicitud:          v.fechaSolicitud || null,
      fechaEnvioDocumentacion: v.fechaEnvioDocumentacion || null,
      fechaDocumentoFirma:     v.fechaDocumentoFirma || null,
      fechaActivo:             v.fechaActivo || null,
      comentarios:             v.comentarios || null,
    };

    const editing = this.editing();
    this.submitting.set(true);
    this.formError.set(null);
    const call = editing
      ? this.service.update(editing.id, payload)
      : this.service.create(payload);

    call.subscribe({
      next: () => {
        this.submitting.set(false);
        this.dialogOpen.set(false);
        this.notify.success(editing ? 'Cambio actualizado' : 'Cambio creado');
        this.reload(this.page());
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.formError.set(extractMessage(err));
      },
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  protected async confirmDelete(row: Cambio): Promise<void> {
    const ok = await this.confirm.ask({
      header: 'Eliminar cambio',
      message: `¿Eliminar la solicitud de <b>${row.clienteNombre}</b>? Esta acción es irreversible.`,
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      variant: 'danger',
    });
    if (!ok) return;
    this.globalLoading.start('Eliminando cambio', 'Eliminando la solicitud de cambio.');
    this.service.delete(row.id).subscribe({
      next: () => {
        this.globalLoading.stop();
        this.notify.success('Cambio eliminado');
        this.reload(this.page());
      },
      error: (err: HttpErrorResponse) => {
        this.globalLoading.stop();
        this.notify.error(extractMessage(err));
      },
    });
  }
}
