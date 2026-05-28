import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Dialog } from 'primeng/dialog';
import { PrimeTemplate } from 'primeng/api';
import { Icon, IconName } from '../../icons/icon';

/**
 * Modal de formulario reutilizable basado en p-dialog.
 *
 * Uso:
 *   <app-form-dialog
 *     [open]="modalOpen()"
 *     title="Nuevo cliente"
 *     subtitle="Crea un nuevo cliente"
 *     icon="plus"
 *     [saving]="submitting()"
 *     [canSave]="form.valid"
 *     saveLabel="Crear cliente"
 *     (cancel)="close()"
 *     (save)="submit()"
 *   >
 *     <!-- contenido del formulario aquí -->
 *   </app-form-dialog>
 */
@Component({
  selector: 'app-form-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Dialog, PrimeTemplate, Icon],
  templateUrl: './form-dialog.html',
})
export class FormDialog {
  readonly open = input.required<boolean>();
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly icon = input<IconName>('plus');
  readonly saving = input<boolean>(false);
  readonly canSave = input<boolean>(true);
  readonly saveLabel = input<string>('Guardar');
  readonly cancelLabel = input<string>('Cancelar');
  readonly width = input<string>('480px');
  readonly errorMessage = input<string | null>(null);

  readonly cancel = output<void>();
  readonly save = output<void>();
}
