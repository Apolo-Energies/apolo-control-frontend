import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';

/**
 * Wrapper sobre el `MessageService` de PrimeNG para mostrar toasts.
 * El `<p-toast>` ya está montado en `app.html`.
 *
 * Uso:
 *   this.notify.success('Usuario creado');
 *   this.notify.error('No se pudo guardar');
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly message = inject(MessageService);

  success(detail: string, summary = 'Éxito'): void {
    this.message.add({ severity: 'success', summary, detail, life: 3500 });
  }

  info(detail: string, summary = 'Información'): void {
    this.message.add({ severity: 'info', summary, detail, life: 3500 });
  }

  warn(detail: string, summary = 'Atención'): void {
    this.message.add({ severity: 'warn', summary, detail, life: 4000 });
  }

  error(detail: string, summary = 'Error'): void {
    this.message.add({ severity: 'error', summary, detail, life: 5000 });
  }

  /** Toast sticky con ruta de navegación — se activa al hacer clic en él. */
  warnNav(detail: string, route: string, summary = 'Atención'): void {
    this.message.add({ severity: 'warn', summary, detail, life: 10000, data: { route } });
  }

  clear(): void {
    this.message.clear();
  }
}
