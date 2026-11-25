import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { FormDialog } from '../../../shared/components/form-dialog/form-dialog';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { TableSkeleton } from '../../../shared/components/table-skeleton/table-skeleton';
import { Icon } from '../../../shared/icons/icon';
import { ActionsMenu, ActionsMenuItem } from '../../../shared/components/actions-menu/actions-menu';

import { VibraTarifaService } from '../../../core/services/vibra-tarifa.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/auth';
import {
  ACCION_CARGA_TARIFA_LABEL, AccionCargaTarifa, CargaTarifasResponse, VibraTarifa, VibraTarifaPayload,
} from '../../../core/models';
import { mensajeError } from '../../../shared/utils/http-error';
import { StatusTone } from '../../../shared/components/status-badge/status-badge';
import { parsePrecios } from '../../../shared/utils/format';

@Component({
  selector: 'app-vibra-preciario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgTemplateOutlet, PageHeader, FormDialog, ConfirmDialog, StatusBadge, TableSkeleton, Icon, ActionsMenu],
  templateUrl: './vibra-preciario.html',
})
export class VibraPreciario {
  private readonly service = inject(VibraTarifaService);
  private readonly notify = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  /** Solo admin cambia el estado desde la lista (el resto ve el badge). */
  protected readonly isAdmin = this.auth.hasRole('admin');
  protected readonly toggling = signal<string | null>(null);

  protected readonly all = signal<VibraTarifa[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<VibraTarifa | null>(null);
  protected readonly submitting = signal(false);

  // Confirm delete
  protected readonly confirmOpen = signal(false);
  protected readonly pendingDelete = signal<VibraTarifa | null>(null);
  protected readonly deleting = signal(false);

  // Detail modal
  protected readonly detailOpen = signal(false);
  protected readonly detailData = signal<VibraTarifa | null>(null);
  protected readonly detailLoading = signal(false);

  /** Una tabla por tipo de tarifa. */
  protected readonly grupos = computed(() => (['2.0TD', '3.0TD'] as const).map((tipo) => ({
    tipo, id: tipo.replace('.', ''), periodos: this.periodosTarifa(tipo), tarifas: this.all().filter((t) => t.tipo === tipo),
  })));

  /** Acciones de cada fila. */
  protected readonly menus = computed(() => new Map<string, ActionsMenuItem[]>(this.all().map((t) => [t.id, [
    { label: 'Ver detalle', icon: 'eye', action: () => this.verDetalle(t.id) },
    { label: 'Editar', icon: 'edit', action: () => this.openEdit(t) },
    { label: 'Eliminar', icon: 'trash', danger: true, separatorBefore: true, action: () => this.askDelete(t) },
  ]])));

  protected periodosTarifa(tipo: string | null | undefined): number[] {
    return tipo === '2.0TD' ? [1, 2, 3] : [1, 2, 3, 4, 5, 6];
  }

  protected readonly form = this.fb.group({
    nombre: ['', Validators.required],
    tipo: ['2.0TD', Validators.required],
    activa: [true],
    p1Energia: [null as number | null],
    p2Energia: [null as number | null],
    p3Energia: [null as number | null],
    p4Energia: [null as number | null],
    p5Energia: [null as number | null],
    p6Energia: [null as number | null],
    p1Potencia: [null as number | null],
    p2Potencia: [null as number | null],
    p3Potencia: [null as number | null],
    p4Potencia: [null as number | null],
    p5Potencia: [null as number | null],
    p6Potencia: [null as number | null],
  });

  // Carga de precios desde la plantilla Excel (solo admin)
  protected readonly cargaOpen = signal(false);
  protected readonly cargaArchivo = signal<File | null>(null);
  protected readonly cargaPreview = signal<CargaTarifasResponse | null>(null);
  protected readonly cargaLeyendo = signal(false);
  protected readonly cargaAplicando = signal(false);
  protected readonly cargaError = signal<string | null>(null);
  protected readonly cargaPuedeAplicar = computed(() => {
    const p = this.cargaPreview();
    return !!p && p.errores === 0 && p.crear + p.actualizar + p.nuevaVersion > 0;
  });
  protected readonly accionLabel = ACCION_CARGA_TARIFA_LABEL;

  constructor() { this.load(); }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.list().subscribe({
      next: (list) => { this.all.set(list); this.loading.set(false); },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message ?? err.message ?? 'Error al cargar tarifas');
        this.loading.set(false);
      },
    });
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.form.reset({ tipo: '2.0TD', activa: true });
    this.dialogOpen.set(true);
  }

  protected openEdit(t: VibraTarifa): void {
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
    const raw = this.form.getRawValue();
    const precios = parsePrecios(raw);
    if (!precios) {
      this.notify.error('Precio no válido: usa un número positivo con hasta 6 decimales');
      return;
    }
    const payload = { ...raw, ...precios } as VibraTarifaPayload;
    this.submitting.set(true);
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

  protected askDelete(t: VibraTarifa): void {
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
        this.notify.error(err.error?.message ?? 'Error al eliminar');
      },
    });
  }

  protected toggleActiva(t: VibraTarifa, activa: boolean): void {
    this.toggling.set(t.id);
    this.all.update(list => list.map(x => (x.id === t.id ? { ...x, activa } : x)));
    this.service.cambiarActiva(t.id, activa).subscribe({
      next: () => {
        this.toggling.set(null);
        this.notify.success(`${t.nombre}: ${activa ? 'activa' : 'inactiva'}`);
      },
      error: (err: HttpErrorResponse) => {
        this.toggling.set(null);
        this.all.update(list => list.map(x => (x.id === t.id ? { ...x, activa: !activa } : x)));
        this.notify.error(err.error?.message ?? 'No se pudo cambiar el estado');
      },
    });
  }

  // ── Carga de precios ─────────────────────────────────────

  protected abrirCarga(): void {
    this.cargaArchivo.set(null);
    this.cargaPreview.set(null);
    this.cargaError.set(null);
    this.cargaOpen.set(true);
  }

  protected cerrarCarga(): void { this.cargaOpen.set(false); }

  protected descargarPlantilla(): void {
    this.service.plantilla().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'vibra-plantilla-precios.xlsx';
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
      },
      error: () => this.notify.error('No se pudo descargar la plantilla'),
    });
  }

  /** Al elegir archivo se pide la vista previa (no cambia nada). */
  protected onArchivoCarga(ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0] ?? null;
    this.cargaArchivo.set(file);
    this.cargaPreview.set(null);
    this.cargaError.set(null);
    if (!file) return;
    this.cargaLeyendo.set(true);
    this.service.cargar(file, false).subscribe({
      next: (r) => { this.cargaPreview.set(r); this.cargaLeyendo.set(false); },
      error: (err: HttpErrorResponse) => {
        this.cargaLeyendo.set(false);
        this.cargaError.set(mensajeError(err, 'No se pudo leer el Excel'));
      },
    });
  }

  protected aplicarCarga(): void {
    const file = this.cargaArchivo();
    if (!file || !this.cargaPuedeAplicar()) return;
    this.cargaAplicando.set(true);
    this.service.cargar(file, true).subscribe({
      next: (r) => {
        this.cargaAplicando.set(false);
        this.notify.success(`Precios cargados: ${r.crear} nuevos, ${r.actualizar} actualizados, ${r.nuevaVersion} versiones nuevas`);
        this.cerrarCarga();
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.cargaAplicando.set(false);
        // 422: hay filas con error; trae la vista previa actualizada
        if (err.status === 422 && err.error?.filas) this.cargaPreview.set(err.error as CargaTarifasResponse);
        this.cargaError.set(mensajeError(err, 'No se aplicó ningún cambio: revisa las filas con error'));
      },
    });
  }

  protected tonoAccion(a: AccionCargaTarifa): StatusTone {
    switch (a) {
      case 'CREAR': return 'success';
      case 'ACTUALIZAR': return 'info';
      case 'NUEVA_VERSION': return 'purple';
      case 'ERROR': return 'danger';
      default: return 'neutral';
    }
  }

  /** Precios de una fila de la carga: los periodos con valor, separados por « · ». */
  protected periodos(valores: (number | null)[]): string {
    const v = valores.map((n, i) => (n == null ? null : `P${i + 1} ${n.toLocaleString('es-ES', { maximumFractionDigits: 6 })}`))
      .filter((x): x is string => x !== null);
    return v.length ? v.join(' · ') : '—';
  }

  protected fmt(n: number | null): string {
    if (n == null) return '—';
    return n.toLocaleString('es-ES', { minimumFractionDigits: 6, maximumFractionDigits: 6 });
  }

  protected verDetalle(id: string): void {
    this.detailOpen.set(true);
    this.detailLoading.set(true);
    this.detailData.set(null);
    this.service.getById(id).subscribe({
      next: (d) => { this.detailData.set(d); this.detailLoading.set(false); },
      error: (err: HttpErrorResponse) => {
        this.detailLoading.set(false);
        this.notify.error(err.error?.message ?? 'Error al cargar detalle');
        this.detailOpen.set(false);
      },
    });
  }

  protected closeDetail(): void {
    this.detailOpen.set(false);
    this.detailData.set(null);
  }
}
