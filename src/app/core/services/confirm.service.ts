import { Injectable, inject } from '@angular/core';
import { ConfirmationService } from 'primeng/api';

export interface ConfirmOptions {
  header?: string;
  message: string;
  acceptLabel?: string;
  rejectLabel?: string;
  /** 'danger' resalta el botón de aceptar en rojo (acciones destructivas). */
  variant?: 'default' | 'danger';
  icon?: string;
}

/**
 * Wrapper sobre el `ConfirmationService` de PrimeNG con API basada en Promise.
 * El template del `<p-confirmDialog>` vive en `app.html`.
 *
 * Uso:
 *   const ok = await this.confirm.ask({
 *     header: 'Eliminar usuario',
 *     message: '¿Eliminar a Juan Pérez?',
 *     variant: 'danger',
 *   });
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly primeConfirm = inject(ConfirmationService);

  ask(options: ConfirmOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const isDanger = options.variant === 'danger';
      this.primeConfirm.confirm({
        header: options.header ?? 'Confirmar acción',
        message: options.message,
        icon: options.icon ?? (isDanger ? 'pi pi-exclamation-triangle' : 'pi pi-question-circle'),
        acceptLabel: options.acceptLabel ?? 'Aceptar',
        rejectLabel: options.rejectLabel ?? 'Cancelar',
        acceptButtonProps: {
          severity: isDanger ? 'danger' : 'primary',
          size: 'small',
        },
        rejectButtonProps: {
          severity: 'secondary',
          size: 'small',
          outlined: true,
        },
        accept: () => resolve(true),
        reject: () => resolve(false),
      });
    });
  }
}
