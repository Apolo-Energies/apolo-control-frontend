import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Código largo que se recorta por delante y deja siempre visible el final (`.cell-tail`). */
@Component({
  selector: '[cellTail]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span>{{ head() }}</span>{{ tail() }}`,
  host: { class: 'cell-tail' },
})
export class CellTail {
  readonly cellTail = input.required<string>();
  /** Caracteres finales que nunca se cortan. */
  readonly keep = input(4);

  protected readonly head = computed(() => this.cellTail().slice(0, -this.keep()));
  protected readonly tail = computed(() => this.cellTail().slice(-this.keep()));
}
