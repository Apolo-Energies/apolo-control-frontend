import { ChangeDetectionStrategy, Component, ElementRef, input, signal, viewChild } from '@angular/core';

import { Icon, IconName } from '../../icons/icon';
import { StatusBadge, StatusTone } from '../status-badge/status-badge';

export interface ActionsMenuItem {
  label: string;
  icon?: IconName;
  danger?: boolean;
  disabled?: boolean;
  /** Raya separadora antes del item. */
  separatorBefore?: boolean;
  /** Opción elegida (menú de estado): menuitemradio marcado. */
  checked?: boolean;
  action: () => void;
}

let seq = 0;

/** Soporte de invocadores (commandfor); si no, popovertarget. */
const CON_COMMAND = typeof HTMLButtonElement !== 'undefined' && 'commandForElement' in HTMLButtonElement.prototype;
/** Soporte de anchor positioning; si no, se coloca por script. */
const CON_ANCHOR = typeof CSS !== 'undefined' && CSS.supports('position-area', 'block-end');

/** Menú «Más»: botón + popover con focusgroup (patrón menu de modern-web-guidance). */
@Component({
  selector: 'app-actions-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, StatusBadge],
  templateUrl: './actions-menu.html',
  host: { class: 'contents' },
})
export class ActionsMenu {
  readonly items = input.required<ActionsMenuItem[]>();
  readonly label = input('Más');
  /** Solo icono (acciones de fila); el texto queda como nombre accesible. */
  readonly iconOnly = input(false);
  /** Disparador como badge de estado con ese tono (estado editable en fila); `label` es el estado. */
  readonly tone = input<StatusTone | null>(null);
  /** Nombre accesible del disparador si el texto visible no basta (p. ej. «Estado del impago: Impagada»). */
  readonly ariaLabel = input<string | null>(null);

  protected readonly id = `actions-menu-${++seq}`;
  protected readonly conCommand = CON_COMMAND;
  protected readonly abierto = signal(false);

  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly menu = viewChild.required<ElementRef<HTMLElement>>('menu');
  /** El último disparo fue de puntero: no se entra en el menú. */
  protected porPuntero = false;

  protected onTriggerKey(e: KeyboardEvent): void {
    this.porPuntero = false;
    if (e.key !== 'ArrowDown') return;
    e.preventDefault();
    if (this.abierto()) this.items_()[0]?.focus();
    else this.trigger().nativeElement.click();
  }

  protected onToggle(e: Event): void {
    const abierto = (e as ToggleEvent).newState === 'open';
    this.abierto.set(abierto);
    if (!abierto) return;
    if (!CON_ANCHOR) this.colocar();
    if (!this.porPuntero) this.items_()[0]?.focus();
    this.porPuntero = false;
  }

  protected onMenuKey(e: KeyboardEvent): void {
    const items = this.items_();
    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      (e.key === 'Home' ? items[0] : items[items.length - 1])?.focus();
    } else if (e.key === 'Tab') {
      // Tab sale del menú desde el disparador
      if (e.shiftKey) e.preventDefault();
      this.cerrar();
    }
  }

  /** Hover sigue al foco. */
  protected onHover(e: PointerEvent): void {
    const b = e.currentTarget as HTMLButtonElement;
    if (!b.disabled && document.activeElement !== b) b.focus();
  }

  protected run(item: ActionsMenuItem): void {
    this.cerrar();
    item.action();
  }

  private cerrar(): void {
    this.menu().nativeElement.hidePopover();
    this.trigger().nativeElement.focus();
  }

  private items_(): HTMLButtonElement[] {
    return [...this.menu().nativeElement.querySelectorAll<HTMLButtonElement>('[focusgroup] > button:not(:disabled)')];
  }

  /** Sin anchor positioning: bajo el disparador, alineado a su borde final, dentro de la ventana. */
  private colocar(): void {
    const t = this.trigger().nativeElement.getBoundingClientRect();
    const m = this.menu().nativeElement;
    const { width, height } = m.getBoundingClientRect();
    const left = Math.min(Math.max(8, t.right - width), innerWidth - width - 8);
    const abajo = t.bottom + 4;
    const top = abajo + height > innerHeight - 8 ? Math.max(8, t.top - height - 4) : abajo;
    m.style.left = `${left}px`;
    m.style.top = `${top}px`;
  }
}
