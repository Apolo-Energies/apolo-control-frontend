import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';

import { PageHeader } from '../../shared/components/page-header/page-header';
import { LoadingOverlay } from '../../shared/components/loading-overlay/loading-overlay';
import { Icon } from '../../shared/icons/icon';
import { SettingService } from '../../core/services/setting.service';
import { TarifaPenalizacionService } from '../../core/services/tarifa-penalizacion.service';
import { EeSyncService } from '../../core/services/ee-sync.service';
import { TipoSolicitudService } from '../../core/services/tipo-solicitud.service';
import { NotificationService } from '../../core/services/notification.service';
import { AppSetting, ApiErrorResponse, JobEjecucion, TarifaPenalizacion, TarifaPenalizacionPayload } from '../../core/models';
import { TipoSolicitud, TipoSolicitudRequest } from '../../core/models/tipo-solicitud.model';

@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, SlicePipe, PageHeader, LoadingOverlay, Icon],
  templateUrl: './settings.html',
})
export class Settings {
  private readonly service = inject(SettingService);
  private readonly tarifaService = inject(TarifaPenalizacionService);
  private readonly eeSyncSvc = inject(EeSyncService);
  private readonly tipoSolicitudSvc = inject(TipoSolicitudService);
  private readonly notify = inject(NotificationService);

  protected readonly loading = signal(false);
  protected readonly saving = signal<string | null>(null); // clave del setting que se está guardando
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly grouped = signal<Record<string, AppSetting[]>>({});

  protected readonly categorias = computed(() => Object.keys(this.grouped()).sort());

  // Copia local de los valores editados (clave → valor string)
  protected readonly draftValues = signal<Record<string, string>>({});

  // ── Sincronización EE ─────────────────────────────────────────────────────
  protected readonly eeSyncHistorial  = signal<JobEjecucion[]>([]);
  protected readonly eeSyncCargando   = signal(false);
  protected readonly eeSyncEjecutando = signal(false);

  // ── Tarifas de penalización ────────────────────────────────────────────────
  protected readonly tarifas = signal<TarifaPenalizacion[]>([]);
  protected readonly tarifaFormOpen = signal(false);
  protected readonly editingTarifa = signal<TarifaPenalizacion | null>(null);
  protected readonly tarifaSaving = signal(false);
  protected readonly tarifaDeleteId = signal<string | null>(null);

  protected tarifaDraft: TarifaPenalizacionPayload = this.emptyTarifa();

  // ── Tipos de solicitud ────────────────────────────────────────────────────
  protected readonly tiposSolicitud = signal<TipoSolicitud[]>([]);
  protected readonly tipoSolicitudFormOpen = signal(false);
  protected readonly editingTipoSolicitud = signal<TipoSolicitud | null>(null);
  protected readonly tipoSolicitudSaving = signal(false);
  protected tipoSolicitudDraft: TipoSolicitudRequest = { codigo: '', nombre: '', activo: true, orden: 0, diasRecordatorio: 30 };

  private emptyTarifa(): TarifaPenalizacionPayload {
    return { nombre: '', pctPenalizacion: 0, precioMega: 140, diasPrevioAviso: 15, recargoSinAviso: 0, activa: true };
  }

  constructor() {
    this.load();
    this.loadTarifas();
    this.loadEeSyncHistorial();
    this.loadTiposSolicitud();
  }

  protected load(): void {
    this.loading.set(true);
    this.service.listGrouped().subscribe({
      next: (data) => {
        this.grouped.set(data);
        // Inicializa el draft con los valores actuales
        const draft: Record<string, string> = {};
        Object.values(data).flat().forEach(s => {
          draft[s.clave] = s.valor ?? '';
        });
        this.draftValues.set(draft);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(extractMessage(err));
        this.loading.set(false);
      },
    });
  }

  protected getSettings(categoria: string): AppSetting[] {
    return this.grouped()[categoria] ?? [];
  }

  protected getDraft(clave: string): string {
    return this.draftValues()[clave] ?? '';
  }

  protected setDraft(clave: string, value: string): void {
    this.draftValues.update(d => ({ ...d, [clave]: value }));
  }

  protected save(setting: AppSetting): void {
    const valor = this.draftValues()[setting.clave] ?? '';
    this.saving.set(setting.clave);
    this.service.setValue(setting.clave, valor || null).subscribe({
      next: (updated) => {
        // Actualiza el grouped con el nuevo valor
        this.grouped.update(g => {
          const cat = { ...g };
          cat[setting.categoria] = cat[setting.categoria].map(s =>
            s.clave === updated.clave ? updated : s
          );
          return cat;
        });
        this.saving.set(null);
        this.notify.success(`"${setting.nombre}" guardado`);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(null);
        this.notify.error(extractMessage(err));
      },
    });
  }

  protected isSaving(clave: string): boolean {
    return this.saving() === clave;
  }

  protected isDirty(setting: AppSetting): boolean {
    return (this.draftValues()[setting.clave] ?? '') !== (setting.valor ?? '');
  }

  // ── Sincronización EE ─────────────────────────────────────────────────────
  protected loadEeSyncHistorial(): void {
    this.eeSyncCargando.set(true);
    this.eeSyncSvc.historial().subscribe({
      next: (data) => { this.eeSyncHistorial.set(data); this.eeSyncCargando.set(false); },
      error: () => this.eeSyncCargando.set(false),
    });
  }

  protected ejecutarEeSync(): void {
    this.eeSyncEjecutando.set(true);
    this.eeSyncSvc.ejecutar().subscribe({
      next: (res) => {
        this.eeSyncEjecutando.set(false);
        this.notify.success('Sincronización completada');
        this.loadEeSyncHistorial();
      },
      error: (err: HttpErrorResponse) => {
        this.eeSyncEjecutando.set(false);
        this.notify.error(extractMessage(err));
      },
    });
  }

  protected resultadoBadgeClass(resultado: string): string {
    switch (resultado) {
      case 'OK':      return 'bg-success/15 text-success-fg';
      case 'ERROR':   return 'bg-danger/15 text-danger-fg';
      case 'OMITIDO': return 'bg-muted text-muted-foreground';
      default:        return 'bg-muted text-muted-foreground';
    }
  }

  // ── Tarifas ─────────────────────────────────────────────────────────────────
  protected loadTarifas(): void {
    this.tarifaService.list().subscribe({
      next: (list) => this.tarifas.set(list),
      error: () => {},
    });
  }

  protected openTarifaCreate(): void {
    this.editingTarifa.set(null);
    this.tarifaDraft = this.emptyTarifa();
    this.tarifaFormOpen.set(true);
  }

  protected openTarifaEdit(t: TarifaPenalizacion): void {
    this.editingTarifa.set(t);
    this.tarifaDraft = {
      nombre: t.nombre,
      pctPenalizacion: t.pctPenalizacion,
      precioMega: t.precioMega,
      diasPrevioAviso: t.diasPrevioAviso,
      recargoSinAviso: t.recargoSinAviso,
      activa: t.activa,
    };
    this.tarifaFormOpen.set(true);
  }

  protected closeTarifaForm(): void {
    this.tarifaFormOpen.set(false);
    this.editingTarifa.set(null);
  }

  protected saveTarifa(): void {
    const editing = this.editingTarifa();
    this.tarifaSaving.set(true);
    const op = editing
      ? this.tarifaService.update(editing.id, this.tarifaDraft)
      : this.tarifaService.create(this.tarifaDraft);

    op.subscribe({
      next: (t) => {
        this.tarifaSaving.set(false);
        this.closeTarifaForm();
        if (editing) {
          this.tarifas.update(list => list.map(x => x.id === t.id ? t : x));
        } else {
          this.tarifas.update(list => [...list, t]);
        }
        this.notify.success(editing ? 'Tarifa actualizada' : 'Tarifa creada');
      },
      error: (err: HttpErrorResponse) => {
        this.tarifaSaving.set(false);
        this.notify.error(extractMessage(err));
      },
    });
  }

  protected deleteTarifa(id: string): void {
    this.tarifaDeleteId.set(id);
    this.tarifaService.delete(id).subscribe({
      next: () => {
        this.tarifaDeleteId.set(null);
        this.tarifas.update(list => list.filter(t => t.id !== id));
        this.notify.success('Tarifa eliminada');
      },
      error: (err: HttpErrorResponse) => {
        this.tarifaDeleteId.set(null);
        this.notify.error(extractMessage(err));
      },
    });
  }

  protected pctDisplay(v: number): string {
    return (v * 100).toFixed(2) + '%';
  }

  // ── Tipos de solicitud ────────────────────────────────────────────────────
  protected loadTiposSolicitud(): void {
    this.tipoSolicitudSvc.findAll().subscribe({
      next: (list) => this.tiposSolicitud.set(list),
      error: () => {},
    });
  }

  protected openTipoCreate(): void {
    this.editingTipoSolicitud.set(null);
    this.tipoSolicitudDraft = { codigo: '', nombre: '', activo: true, orden: this.tiposSolicitud().length + 1, diasRecordatorio: 30 };
    this.tipoSolicitudFormOpen.set(true);
  }

  protected openTipoEdit(ts: TipoSolicitud): void {
    this.editingTipoSolicitud.set(ts);
    this.tipoSolicitudDraft = { codigo: ts.codigo, nombre: ts.nombre, activo: ts.activo, orden: ts.orden, diasRecordatorio: ts.diasRecordatorio ?? 30 };
    this.tipoSolicitudFormOpen.set(true);
  }

  protected closeTipoForm(): void {
    this.tipoSolicitudFormOpen.set(false);
    this.editingTipoSolicitud.set(null);
  }

  protected saveTipoSolicitud(): void {
    const editing = this.editingTipoSolicitud();
    this.tipoSolicitudSaving.set(true);
    const op = editing
      ? this.tipoSolicitudSvc.update(editing.id, this.tipoSolicitudDraft)
      : this.tipoSolicitudSvc.create(this.tipoSolicitudDraft);

    op.subscribe({
      next: (ts) => {
        this.tipoSolicitudSaving.set(false);
        this.closeTipoForm();
        if (editing) {
          this.tiposSolicitud.update(list => list.map(x => x.id === ts.id ? ts : x));
        } else {
          this.tiposSolicitud.update(list => [...list, ts].sort((a, b) => a.orden - b.orden));
        }
        this.notify.success(editing ? 'Tipo actualizado' : 'Tipo creado');
      },
      error: (err: HttpErrorResponse) => {
        this.tipoSolicitudSaving.set(false);
        this.notify.error(extractMessage(err));
      },
    });
  }

  protected deleteTipoSolicitud(id: string): void {
    this.tipoSolicitudSvc.delete(id).subscribe({
      next: () => {
        this.tiposSolicitud.update(list => list.filter(ts => ts.id !== id));
        this.notify.success('Tipo eliminado');
      },
      error: (err: HttpErrorResponse) => this.notify.error(extractMessage(err)),
    });
  }

  protected toggleTipoActivo(ts: TipoSolicitud): void {
    this.tipoSolicitudSvc.update(ts.id, { ...ts, activo: !ts.activo }).subscribe({
      next: (updated) => this.tiposSolicitud.update(list => list.map(x => x.id === updated.id ? updated : x)),
      error: (err: HttpErrorResponse) => this.notify.error(extractMessage(err)),
    });
  }
}

function extractMessage(error: HttpErrorResponse): string {
  const body = error.error as ApiErrorResponse | undefined;
  if (body?.message) return body.message;
  if (error.status === 0) return 'No se puede conectar con el servidor';
  return error.message || 'Error al cargar la configuración';
}
