import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormDialog } from '../form-dialog/form-dialog';
import { IconName } from '../../icons/icon';

/**
 * Modal de confirmación reutilizable. Usa FormDialog internamente.
 *
 * Uso:
 *   <app-confirm-dialog
 *     [open]="confirmOpen()"
 *     title="Eliminar tarifa"
 *     [message]="'¿Eliminar la tarifa \'' + name + '\'?'"
 *     confirmLabel="Eliminar"
 *     tone="danger"
 *     (confirm)="doDelete()"
 *     (cancel)="closeConfirm()"
 *   />
 */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormDialog],
  template: `
    <app-form-dialog
      [open]="open()"
      [title]="title()"
      [icon]="icon()"
      [saving]="loading()"
      [canSave]="true"
      [saveLabel]="confirmLabel()"
      (save)="confirm.emit()"
      (cancel)="cancel.emit()">
      <p class="text-sm text-foreground py-2">{{ message() }}</p>
    </app-form-dialog>
  `,
})
export class ConfirmDialog {
  readonly open = input.required<boolean>();
  readonly title = input<string>('Confirmar');
  readonly message = input.required<string>();
  readonly confirmLabel = input<string>('Aceptar');
  readonly loading = input<boolean>(false);
  readonly icon = input<IconName>('alert-triangle');
  /** Tone visual — informativo o crítico. No cambia comportamiento. */
  readonly tone = input<'danger' | 'warning' | 'info'>('warning');

  readonly confirm = output<void>();
  readonly cancel = output<void>();
}
