import {
  ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Observable, of } from 'rxjs';

import { PageHeader } from '../../shared/components/page-header/page-header';
import { TableSkeleton } from '../../shared/components/table-skeleton/table-skeleton';
import { StatusBadge, StatusTone } from '../../shared/components/status-badge/status-badge';
import { Pagination } from '../../shared/components/pagination/pagination';
import { FormDialog } from '../../shared/components/form-dialog/form-dialog';
import { RemoteSelect, RemoteOption } from '../../shared/components/remote-select/remote-select';
import { Icon } from '../../shared/icons/icon';
import { RechazoService } from '../../core/services/rechazo.service';
import { ContractService } from '../../core/services/contract.service';
import { MasterDataService } from '../../core/services/master-data.service';
import { NotificationService } from '../../core/services/notification.service';
import { GlobalLoadingService } from '../../core/services/global-loading.service';
import { ListStateService }     from '../../core/services/list-state.service';
import {
  Rechazo, RechazoEstado, RechazoResultado,
  RECHAZO_ESTADO_LABEL, RECHAZO_RESULTADO_LABEL,
  RECHAZO_ESTADO_VALUES, RECHAZO_RESULTADO_VALUES,
  RECHAZO_PLATAFORMA_LABEL, RECHAZO_PLATAFORMA_VALUES,
} from '../../core/models/rechazo.model';
import { Contract, ContractStatus, CONTRACT_STATUS_LABEL, Page } from '../../core/models';
import { formatDate, safeText } from '../../shared/utils/format';

const ESTADO_TONE: Record<RechazoEstado, StatusTone> = {
  rechazado: 'danger',
  incidencia: 'warning',
  activo: 'success',
};

const RESULTADO_TONE: Record<RechazoResultado, StatusTone> = {
  tramitado_de_nuevo: 'info',
  resuelta: 'success',
  ko: 'danger',
  gestionado: 'purple',
};

function extractMessage(err: HttpErrorResponse): string {
  return (err.error as { message?: string })?.message ?? err.message ?? 'Error inesperado';
}

@Component({
  selector: 'app-rechazos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeader, TableSkeleton, StatusBadge, Pagination, FormDialog,
    RemoteSelect, Icon, FormsModule, ReactiveFormsModule,
  ],
  templateUrl: './rechazos.html',
})
export class Rechazos implements OnDestroy {
  private readonly service = inject(RechazoService);
  private readonly contractService = inject(ContractService);
  private readonly masterData = inject(MasterDataService);
  private readonly notify = inject(NotificationService);
  private readonly globalLoading = inject(GlobalLoadingService);
  private readonly fb = inject(FormBuilder);
  private readonly listState = inject(ListStateService);

  // ── List state ────────────────────────────────────────────────────────────
  protected readonly loading = signal(false);
  protected readonly result = signal<Page<Rechazo> | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly page = signal(0);
  protected readonly size = signal(20);

  // ── Filters ───────────────────────────────────────────────────────────────
  protected q = '';
  protected estadoFilter: RechazoEstado | '' = '';
  protected resultadoFilter: RechazoResultado | '' = '';

  // ── Constants ─────────────────────────────────────────────────────────────
  protected readonly estadoValues = RECHAZO_ESTADO_VALUES;
  protected readonly resultadoValues = RECHAZO_RESULTADO_VALUES;
  protected readonly plataformaValues = RECHAZO_PLATAFORMA_VALUES;
  protected readonly plataformaLabel = RECHAZO_PLATAFORMA_LABEL;

  protected readonly rows = computed(() => this.result()?.content ?? []);
  protected readonly totalElements = computed(() => this.result()?.totalElements ?? 0);
  protected readonly totalPages = computed(() => this.result()?.totalPages ?? 0);

  // ── Delegaciones from master data ─────────────────────────────────────────
  protected readonly delegaciones = computed(() => this.masterData.delegacionesActivas());

  // ── Create/Edit dialog ────────────────────────────────────────────────────
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<Rechazo | null>(null);
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly selectedFiles = signal<File[]>([]);
  protected readonly isReadOnly = computed(() => {
    const r = this.editing();
    return r != null && (r.resultado === 'resuelta' || r.resultado === 'ko');
  });

  protected readonly form = this.fb.group({
    nombre: ['', Validators.required],
    estado: ['activo'],
    resultado: [''],
    motivo: [''],
    documentacionNecesaria: [''],
    clienteId: [''],
    delegacionId: [''],
    plataforma: [''],
    numeroTicket: [''],
    diasRecordatorio: [3, [Validators.min(1)]],
    fechaRecordatorio: [''],
    contratoId: [''],
  });

  // ── Master data search functions ──────────────────────────────────────────
  protected readonly searchClientes = (q: string): Observable<RemoteOption[]> => {
    const query = q.trim().toLowerCase();
    const results = this.masterData.clientesActivos()
      .filter(c => !query || c.nombre.toLowerCase().includes(query) || (c.nif?.toLowerCase().includes(query) ?? false))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .slice(0, 50)
      .map(c => ({ id: c.id, label: c.nombre, sublabel: c.nif ?? undefined }));
    return of(results);
  };

  // ── Contract search ───────────────────────────────────────────────────────
  protected readonly selectedContract = signal<{ id: string; label: string } | null>(null);
  protected readonly contractResults = signal<Contract[]>([]);
  protected readonly contractSearching = signal(false);
  protected readonly contractDropdownOpen = signal(false);
  protected contractSearchTerm = '';
  private searchDebounce: ReturnType<typeof setTimeout> | null = null;

  // ── Comment state ─────────────────────────────────────────────────────────
  protected nuevoComentario = '';
  protected readonly addingComment = signal(false);

  constructor() {
    const s = this.listState.get<{ q: string; estadoFilter: string; resultadoFilter: string; page: number; size: number }>('rechazos');
    if (s) {
      this.q = s.q;
      this.estadoFilter = s.estadoFilter as RechazoEstado | '';
      this.resultadoFilter = s.resultadoFilter as RechazoResultado | '';
      this.size.set(s.size);
    }
    this.reload(s?.page ?? 0);
  }

  ngOnDestroy(): void {
    this.listState.save('rechazos', {
      q: this.q, estadoFilter: this.estadoFilter, resultadoFilter: this.resultadoFilter,
      page: this.page(), size: this.size(),
    });
  }

  // ── List ──────────────────────────────────────────────────────────────────
  protected reload(p: number): void {
    this.page.set(p);
    this.loading.set(true);
    this.service.list(
      { q: this.q || undefined, estado: this.estadoFilter || undefined, resultado: this.resultadoFilter || undefined },
      p, this.size(),
    ).subscribe({
      next: (res) => { this.result.set(res); this.loading.set(false); },
      error: (err: HttpErrorResponse) => { this.error.set(extractMessage(err)); this.loading.set(false); },
    });
  }

  protected onSizeChange(size: number): void {
    this.size.set(size);
    this.reload(0);
  }

  protected applyFilters(): void { this.reload(0); }
  protected clearFilters(): void {
    this.q = ''; this.estadoFilter = ''; this.resultadoFilter = '';
    this.reload(0);
  }

  // ── Create ────────────────────────────────────────────────────────────────
  protected openCreate(): void {
    this.editing.set(null);
    this.formError.set(null);
    this.selectedFiles.set([]);
    this.resetContractSearch();
    this.form.reset({ estado: 'activo', diasRecordatorio: 3 });
    this.form.enable();
    this.dialogOpen.set(true);
  }

  // ── Edit ──────────────────────────────────────────────────────────────────
  protected openEdit(r: Rechazo): void {
    this.editing.set(r);
    this.formError.set(null);
    this.selectedFiles.set([]);
    this.form.patchValue({
      nombre: r.nombre,
      estado: r.estado,
      resultado: r.resultado ?? '',
      motivo: r.motivo ?? '',
      documentacionNecesaria: r.documentacionNecesaria ?? '',
      clienteId: r.clienteId ?? '',
      delegacionId: r.delegacionId ?? '',
      plataforma: r.plataforma ?? '',
      numeroTicket: r.numeroTicket ?? '',
      diasRecordatorio: r.diasRecordatorio,
      fechaRecordatorio: r.fechaRecordatorio ?? '',
      contratoId: r.contratoId ?? '',
    });
    if (r.contratoId) {
      const label = r.contratoIdExterno ?? r.contratoId;
      this.selectedContract.set({ id: r.contratoId, label });
      this.contractSearchTerm = label;
    } else {
      this.resetContractSearch();
    }
    if (this.isReadOnly()) { this.form.disable(); } else { this.form.enable(); }
    this.dialogOpen.set(true);
  }

  protected closeDialog(): void {
    this.dialogOpen.set(false);
    this.editing.set(null);
    this.resetContractSearch();
  }

  protected onFilesChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) this.selectedFiles.set(Array.from(input.files));
  }

  protected submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const payload = {
      nombre: v.nombre!,
      estado: v.estado || null,
      resultado: v.resultado || null,
      contratoId: v.contratoId || null,
      clienteId: v.clienteId || null,
      delegacionId: v.delegacionId || null,
      motivo: v.motivo || null,
      documentacionNecesaria: v.documentacionNecesaria || null,
      plataforma: v.plataforma || null,
      numeroTicket: v.numeroTicket || null,
      diasRecordatorio: v.diasRecordatorio ?? 3,
      fechaRecordatorio: v.fechaRecordatorio || null,
    };
    this.submitting.set(true);
    this.formError.set(null);
    this.globalLoading.start('Guardando', 'Procesando rechazo/incidencia…');

    const r = this.editing();
    const obs = r
      ? this.service.update(r.id, payload, this.selectedFiles())
      : this.service.create(payload, this.selectedFiles());

    obs.subscribe({
      next: () => {
        this.submitting.set(false);
        this.globalLoading.stop();
        this.closeDialog();
        this.notify.success(r ? 'Actualizado correctamente' : 'Creado correctamente');
        this.reload(this.page());
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.globalLoading.stop();
        this.formError.set(extractMessage(err));
      },
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  protected confirmDelete(r: Rechazo): void {
    if (!confirm(`¿Eliminar "${r.nombre}"?`)) return;
    this.globalLoading.start('Eliminando', '');
    this.service.delete(r.id).subscribe({
      next: () => { this.globalLoading.stop(); this.notify.success('Eliminado'); this.reload(this.page()); },
      error: (err: HttpErrorResponse) => { this.globalLoading.stop(); this.notify.error(extractMessage(err)); },
    });
  }

  // ── Contract search ───────────────────────────────────────────────────────
  protected onContractInput(term: string): void {
    this.contractSearchTerm = term;
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    if (!term.trim()) {
      this.contractResults.set([]);
      this.contractDropdownOpen.set(false);
      return;
    }
    this.searchDebounce = setTimeout(() => {
      this.contractSearching.set(true);
      this.contractService.list({ q: term }, { page: 0, size: 8 }).subscribe({
        next: (p) => {
          this.contractResults.set(p.content);
          this.contractDropdownOpen.set(p.content.length > 0);
          this.contractSearching.set(false);
        },
        error: () => this.contractSearching.set(false),
      });
    }, 300);
  }

  protected selectContract(c: Contract): void {
    const label = [c.idExterno, c.cups].filter(Boolean).join(' · ');
    this.selectedContract.set({ id: c.id, label });
    this.contractSearchTerm = label;
    this.contractDropdownOpen.set(false);
    this.contractResults.set([]);
    // Resolve delegación ID from master data by name
    const delegacion = this.masterData.delegacionesActivas()
      .find(d => d.nombre === c.clienteDelegacion);
    this.form.patchValue({
      contratoId: c.id,
      clienteId: c.clienteId,
      delegacionId: delegacion?.id ?? '',
    });
  }

  protected clearContract(): void {
    this.resetContractSearch();
    this.form.patchValue({ contratoId: '', clienteId: '', delegacionId: '' });
  }

  private resetContractSearch(): void {
    this.selectedContract.set(null);
    this.contractSearchTerm = '';
    this.contractResults.set([]);
    this.contractDropdownOpen.set(false);
    if (this.searchDebounce) { clearTimeout(this.searchDebounce); this.searchDebounce = null; }
  }

  // ── Comments ──────────────────────────────────────────────────────────────
  protected addComentario(): void {
    const r = this.editing();
    if (!r || !this.nuevoComentario.trim()) return;
    this.addingComment.set(true);
    this.service.addComentario(r.id, this.nuevoComentario.trim(), 'Usuario').subscribe({
      next: (updated) => {
        this.editing.set(updated);
        this.nuevoComentario = '';
        this.addingComment.set(false);
        this.reload(this.page());
      },
      error: () => this.addingComment.set(false),
    });
  }

  // ── Attachments ───────────────────────────────────────────────────────────
  protected deleteAnexo(anexoId: string): void {
    const r = this.editing();
    if (!r) return;
    this.service.deleteAnexo(r.id, anexoId).subscribe({
      next: () => {
        this.editing.update(cur => cur ? { ...cur, anexos: cur.anexos.filter(a => a.id !== anexoId) } : cur);
      },
      error: (err: HttpErrorResponse) => this.notify.error(extractMessage(err)),
    });
  }

  protected downloadUrl(r: Rechazo, anexoId: string): string {
    return this.service.downloadAnexoUrl(r.id, anexoId);
  }

  // ── Display helpers ───────────────────────────────────────────────────────
  protected estadoTone(estado: RechazoEstado): StatusTone { return ESTADO_TONE[estado] ?? 'neutral'; }
  protected estadoLabel(estado: RechazoEstado): string { return RECHAZO_ESTADO_LABEL[estado] ?? estado; }
  protected contratoEstadoLabel(estado: ContractStatus | null): string { return estado ? (CONTRACT_STATUS_LABEL[estado] ?? estado) : ''; }
  protected contratoEstadoClass(estado: ContractStatus | null): string {
    const map: Partial<Record<ContractStatus, string>> = {
      activo: 'bg-success/15 text-success-fg',
      confirmado: 'bg-info/15 text-info-fg',
      valido: 'bg-success/15 text-success-fg',
      para_firma: 'bg-warning/15 text-warning-fg',
      para_tramitar: 'bg-warning/15 text-warning-fg',
      para_estudio: 'bg-info/15 text-info-fg',
      previo: 'bg-info/15 text-info-fg',
      renovado: 'bg-purple/15 text-purple-fg',
      ko: 'bg-danger/15 text-danger-fg',
      rechazado: 'bg-danger/15 text-danger-fg',
      incidencia: 'bg-warning/15 text-warning-fg',
      desestimado: 'bg-danger/15 text-danger-fg',
      baja: 'bg-muted text-muted-foreground',
      finalizado: 'bg-muted text-muted-foreground',
      anulado: 'bg-muted text-muted-foreground',
    };
    return (estado ? map[estado] : null) ?? 'bg-muted text-muted-foreground';
  }
  protected resultadoTone(res: RechazoResultado | null): StatusTone { return res ? (RESULTADO_TONE[res] ?? 'neutral') : 'neutral'; }
  protected resultadoLabel(res: RechazoResultado | null): string { return res ? (RECHAZO_RESULTADO_LABEL[res] ?? res) : '—'; }
  protected date(v: string | null): string { return formatDate(v); }
  protected text(v: string | null): string { return safeText(v); }
  protected fileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
