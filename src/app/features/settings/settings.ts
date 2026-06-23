import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { PageHeader } from '../../shared/components/page-header/page-header';
import { LoadingOverlay } from '../../shared/components/loading-overlay/loading-overlay';
import { Icon } from '../../shared/icons/icon';
import { SettingService } from '../../core/services/setting.service';
import { NotificationService } from '../../core/services/notification.service';
import { AppSetting, ApiErrorResponse } from '../../core/models';

@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, PageHeader, LoadingOverlay, Icon],
  templateUrl: './settings.html',
})
export class Settings {
  private readonly service = inject(SettingService);
  private readonly notify = inject(NotificationService);

  protected readonly loading = signal(false);
  protected readonly saving = signal<string | null>(null); // clave del setting que se está guardando
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly grouped = signal<Record<string, AppSetting[]>>({});

  protected readonly categorias = computed(() => Object.keys(this.grouped()).sort());

  // Copia local de los valores editados (clave → valor string)
  protected readonly draftValues = signal<Record<string, string>>({});

  constructor() {
    this.load();
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
}

function extractMessage(error: HttpErrorResponse): string {
  const body = error.error as ApiErrorResponse | undefined;
  if (body?.message) return body.message;
  if (error.status === 0) return 'No se puede conectar con el servidor';
  return error.message || 'Error al cargar la configuración';
}
