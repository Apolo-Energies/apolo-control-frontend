import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Cabecera de página. Acciones: `[secondary]` (≤2), `app-actions-menu` («Más») y un único `[primary]`
 * (clase `btn btn-primary`), en ese orden; el contenido sin slot se mantiene por compatibilidad.
 */
@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page-header.html',
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
}
