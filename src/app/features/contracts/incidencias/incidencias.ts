import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router } from '@angular/router';

import { PageHeader }    from '../../../shared/components/page-header/page-header';
import { TableSkeleton } from '../../../shared/components/table-skeleton/table-skeleton';
import { EmptyState }    from '../../../shared/components/empty-state/empty-state';
import { FormDialog }    from '../../../shared/components/form-dialog/form-dialog';
import { Icon }          from '../../../shared/icons/icon';
import { StatusBadge, StatusTone } from '../../../shared/components/status-badge/status-badge';

import { ContractService }  from '../../../core/services/contract.service';
import { CustomerService }  from '../../../core/services/customer.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ContratoIncidencia, ContratoCheckItem, ContratoAnexo } from '../../../core/models';

const ESTADO_LABEL: Record<string, string> = {
  previo:         'Previo',
  para_estudio:   'Para estudio',
  para_tramitar:  'Para tramitar',
  para_firma:     'Para firma',
  incidencia:     'Incidencia',
};

const ESTADO_TONE: Record<string, StatusTone> = {
  previo:        'info',
  para_estudio:  'info',
  para_tramitar: 'warning',
  para_firma:    'warning',
  incidencia:    'warning',
};

@Component({
  selector: 'app-incidencias',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, TableSkeleton, EmptyState, FormDialog, Icon, StatusBadge, FormsModule, ReactiveFormsModule],
  templateUrl: './incidencias.html',
})
export class Incidencias implements OnInit {
  private readonly contractService = inject(ContractService);
  private readonly customerService = inject(CustomerService);
  private readonly notify          = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly loading    = signal(true);
  protected readonly rows       = signal<ContratoIncidencia[]>([]);
  protected readonly error      = signal<string | null>(null);
  protected readonly expandedId = signal<string | null>(null);

  // ── Filtros ─────────────────────────────────────────────────────────────────
  protected readonly filterQ        = signal('');
  protected readonly filterEstado   = signal('');
  protected readonly filterFaltante = signal('');

  protected readonly filteredRows = computed(() => {
    const q        = this.filterQ().toLowerCase().trim();
    const estado   = this.filterEstado();
    const faltante = this.filterFaltante();

    return this.rows().filter(r => {
      if (estado && r.estado !== estado) return false;
      if (q) {
        const hit = r.clienteNombre.toLowerCase().includes(q)
          || (r.clienteNif ?? '').toLowerCase().includes(q)
          || r.cups.some(c => c.toLowerCase().includes(q));
        if (!hit) return false;
      }
      if (faltante) {
        // nif y nombre tienen claves distintas según tipo de persona → buscar por field
        const byField = faltante === 'nif' || faltante === 'nombre';
        const item = byField
          ? r.checklist.find(i => i.field === faltante)
          : r.checklist.find(i => i.key === faltante);
        if (!item || item.completed) return false;
      }
      return true;
    });
  });

  // ── Paginación ───────────────────────────────────────────────────────────────
  private readonly PAGE_SIZE = 25;
  protected readonly page = signal(0);

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredRows().length / this.PAGE_SIZE)),
  );

  protected readonly pagedRows = computed(() =>
    this.filteredRows().slice(
      this.page() * this.PAGE_SIZE,
      (this.page() + 1) * this.PAGE_SIZE,
    ),
  );

  protected readonly paginationInfo = computed(() => {
    const total = this.filteredRows().length;
    const p     = this.page();
    return {
      from:    total === 0 ? 0 : p * this.PAGE_SIZE + 1,
      to:      Math.min((p + 1) * this.PAGE_SIZE, total),
      total,
      current: p + 1,
      pages:   this.totalPages(),
    };
  });

  protected prevPage(): void { if (this.page() > 0) this.page.update(p => p - 1); }
  protected nextPage(): void { if (this.page() < this.totalPages() - 1) this.page.update(p => p + 1); }

  protected setQ(v: string):        void { this.filterQ.set(v);        this.page.set(0); }
  protected setEstado(v: string):   void { this.filterEstado.set(v);   this.page.set(0); }
  protected setFaltante(v: string): void { this.filterFaltante.set(v); this.page.set(0); }

  protected clearFilters(): void {
    this.filterQ.set('');
    this.filterEstado.set('');
    this.filterFaltante.set('');
    this.page.set(0);
  }

  protected get hasFilters(): boolean {
    return !!(this.filterQ() || this.filterEstado() || this.filterFaltante());
  }

  protected readonly editOpen    = signal(false);
  protected readonly editItem    = signal<ContratoCheckItem | null>(null);
  protected readonly editContrato = signal<ContratoIncidencia | null>(null);
  protected readonly saving      = signal(false);
  protected readonly formError   = signal<string | null>(null);
  protected readonly editValue   = new FormControl<string>('', { nonNullable: true });

  // ── Adjuntos ─────────────────────────────────────────────────────────────
  protected readonly anexosMap     = signal<Partial<Record<string, ContratoAnexo[]>>>({});
  protected readonly anexosLoading = signal<Partial<Record<string, boolean>>>({});
  protected readonly uploadOpen    = signal<string | null>(null);
  protected uploadDescripcion = '';
  protected uploadFile: File | null = null;

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.contractService.getIncidencias().subscribe({
      next: rows => { this.rows.set(rows); this.loading.set(false); },
      error: () => { this.error.set('Error al cargar incidencias'); this.loading.set(false); },
    });
  }

  protected toggleExpand(id: string): void {
    const isOpening = this.expandedId() !== id;
    this.expandedId.update(curr => curr === id ? null : id);
    if (isOpening && this.anexosMap()[id] === undefined) {
      this.loadAnexos(id);
    }
  }

  private loadAnexos(contratoId: string): void {
    this.anexosLoading.update(m => ({ ...m, [contratoId]: true }));
    this.contractService.getAnexos(contratoId).subscribe({
      next: (list) => {
        this.anexosMap.update(m => ({ ...m, [contratoId]: list }));
        this.anexosLoading.update(m => ({ ...m, [contratoId]: false }));
      },
      error: () => {
        this.anexosMap.update(m => ({ ...m, [contratoId]: [] }));
        this.anexosLoading.update(m => ({ ...m, [contratoId]: false }));
      },
    });
  }

  protected openUpload(contratoId: string): void {
    this.uploadDescripcion = '';
    this.uploadFile = null;
    this.uploadOpen.set(contratoId);
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.uploadFile = input.files?.[0] ?? null;
  }

  protected submitUpload(): void {
    const contratoId = this.uploadOpen();
    if (!contratoId || !this.uploadFile) return;
    this.saving.set(true);
    this.contractService.uploadAnexo(contratoId, this.uploadFile, this.uploadDescripcion || undefined).subscribe({
      next: (anexo) => {
        this.anexosMap.update(m => ({ ...m, [contratoId]: [anexo, ...(m[contratoId] ?? [])] }));
        this.saving.set(false);
        this.uploadOpen.set(null);
        this.notify.success('Archivo subido');
      },
      error: () => {
        this.saving.set(false);
        this.notify.error('Error al subir el archivo');
      },
    });
  }

  protected deleteAnexo(contratoId: string, anexoId: string): void {
    this.contractService.deleteAnexo(contratoId, anexoId).subscribe({
      next: () => {
        this.anexosMap.update(m => ({
          ...m,
          [contratoId]: (m[contratoId] ?? []).filter(a => a.id !== anexoId),
        }));
        this.notify.success('Archivo eliminado');
      },
      error: () => this.notify.error('Error al eliminar el archivo'),
    });
  }

  protected downloadAnexo(contratoId: string, anexo: ContratoAnexo): void {
    this.contractService.downloadAnexo(contratoId, anexo.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = anexo.nombreArchivo;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.notify.error('Error al descargar el archivo'),
    });
  }

  protected formatBytes(bytes: number | null): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  protected groupItems(checklist: ContratoCheckItem[], group: string): ContratoCheckItem[] {
    return checklist.filter(i => i.group === group);
  }

  protected progressPercent(row: ContratoIncidencia): number {
    return row.totalItems > 0 ? Math.round((row.completedItems / row.totalItems) * 100) : 0;
  }

  protected progressClass(row: ContratoIncidencia): string {
    const pct = this.progressPercent(row);
    if (pct >= 80) return 'bg-green-500';
    if (pct >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  }

  protected estadoLabel(estado: string): string {
    return ESTADO_LABEL[estado] ?? estado;
  }

  protected estadoTone(estado: string): StatusTone {
    return ESTADO_TONE[estado] ?? 'neutral';
  }

  protected fmt(v: string | null | undefined): string {
    if (!v) return '—';
    const [y, m, d] = v.split('-');
    return `${d}/${m}/${y}`;
  }

  protected navigateToContract(id: string): void {
    void this.router.navigate(['/contracts'], { queryParams: { id } });
  }

  // ── Edit dialog (cliente text fields) ──────────────────────────────────────

  protected openEdit(contrato: ContratoIncidencia, item: ContratoCheckItem): void {
    this.editItem.set(item);
    this.editContrato.set(contrato);
    this.editValue.setValue(item.currentValue ?? '');
    this.formError.set(null);
    this.editOpen.set(true);
  }

  protected closeEdit(): void {
    this.editOpen.set(false);
    this.editItem.set(null);
    this.editContrato.set(null);
  }

  protected get canSaveEdit(): boolean {
    return this.editValue.value.trim().length > 0;
  }

  protected saveEdit(): void {
    const item = this.editItem();
    const contrato = this.editContrato();
    if (!item || !contrato || !item.field) return;

    this.saving.set(true);
    this.formError.set(null);
    this.customerService.patch(contrato.clienteId, { [item.field]: this.editValue.value }).subscribe({
      next: () => {
        const newValue = this.editValue.value;
        this.rows.update(rows => rows.map(r => {
          if (r.id !== contrato.id) return r;
          const newChecklist = r.checklist.map(i =>
            i.key === item.key ? { ...i, completed: newValue.trim().length > 0, currentValue: newValue } : i
          );
          const completedItems = newChecklist.filter(i => !i.optional && i.completed).length;
          return { ...r, checklist: newChecklist, completedItems };
        }));
        this.saving.set(false);
        this.closeEdit();
      },
      error: () => {
        this.saving.set(false);
        this.formError.set('Error al guardar. Inténtalo de nuevo.');
      },
    });
  }

  // ── Firma toggle ────────────────────────────────────────────────────────────

  protected toggleFirma(contrato: ContratoIncidencia): void {
    this.saving.set(true);
    this.contractService.toggleValidado(contrato.id).subscribe({
      next: updated => {
        const firmado = updated.validado;
        this.rows.update(rows => rows.map(r => {
          if (r.id !== contrato.id) return r;
          const newChecklist = r.checklist.map(i =>
            i.key === 'firmaSms'
              ? { ...i, completed: firmado, currentValue: firmado ? 'Firmado' : null }
              : i
          );
          const completedItems = newChecklist.filter(i => !i.optional && i.completed).length;
          return { ...r, checklist: newChecklist, completedItems };
        }));
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }
}
