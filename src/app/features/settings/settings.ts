import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { PageHeader } from '../../shared/components/page-header/page-header';
import { LoadingOverlay } from '../../shared/components/loading-overlay/loading-overlay';
import { Icon } from '../../shared/icons/icon';
import { SettingService } from '../../core/services/setting.service';
import { TarifaPenalizacionService } from '../../core/services/tarifa-penalizacion.service';
import { NotificationService } from '../../core/services/notification.service';
import { AppSetting, ApiErrorResponse, TarifaPenalizacion, TarifaPenalizacionPayload } from '../../core/models';

@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, PageHeader, LoadingOverlay, Icon],
  templateUrl: './settings.html',
})
export class Settings {
  private readonly service = inject(SettingService);
  private readonly tarifaService = inject(TarifaPenalizacionService);
  private readonly notify = inject(NotificationService);

  protected readonly loading = signal(false);
  protected readonly saving = signal<string | null>(null); // clave del setting que se está guardando
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly grouped = signal<Record<string, AppSetting[]>>({});

  protected readonly categorias = computed(() => Object.keys(this.grouped()).sort());

  // Copia local de los valores editados (clave → valor string)
  protected readonly draftValues = signal<Record<string, string>>({});

  // ── Tarifas de penalización ────────────────────────────────────────────────
  protected readonly tarifas = signal<TarifaPenalizacion[]>([]);
  protected readonly tarifaFormOpen = signal(false);
  protected readonly editingTarifa = signal<TarifaPenalizacion | null>(null);
  protected readonly tarifaSaving = signal(false);
  protected readonly tarifaDeleteId = signal<string | null>(null);

  protected tarifaDraft: TarifaPenalizacionPayload = this.emptyTarifa();

  private emptyTarifa(): TarifaPenalizacionPayload {
    return { nombre: '', pctPenalizacion: 0, precioMega: 140, diasPrevioAviso: 15, recargoSinAviso: 0, activa: true };
  }

  constructor() {
    this.load();
    this.loadTarifas();
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
}

function extractMessage(error: HttpErrorResponse): string {
  const body = error.error as ApiErrorResponse | undefined;
  if (body?.message) return body.message;
  if (error.status === 0) return 'No se puede conectar con el servidor';
  return error.message || 'Error al cargar la configuración';
}
