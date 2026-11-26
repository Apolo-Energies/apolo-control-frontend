import { Directive, ElementRef, inject } from '@angular/core';

/** Controles de la fila que hacen lo suyo y no abren la ficha. */
const INTERACTIVO = 'a, button, input, select, textarea, label, summary, [role="button"], [role="menuitem"], [popover], [contenteditable]';

/**
 * Fila que abre su ficha al pulsar en cualquier parte: activa el control marcado con `data-row-primary`
 * (enlace o botón). Ctrl/Cmd/Mayús + clic o rueda abren el enlace en otra pestaña. Seleccionar texto no abre nada.
 */
@Directive({
  selector: 'tr[rowLink]',
  host: {
    class: 'row-link',
    '(pointerdown)': 'onPointerDown()',
    '(click)': 'onClick($event)',
    '(auxclick)': 'onAuxClick($event)',
  },
})
export class RowLink {
  private readonly row = inject<ElementRef<HTMLTableRowElement>>(ElementRef).nativeElement;
  /** El clic solo cierra un menú abierto: no abre la ficha. */
  private cierraMenu = false;

  protected onPointerDown(): void {
    this.cierraMenu = !!document.querySelector(':popover-open');
  }

  protected onClick(e: MouseEvent): void {
    if (this.cierraMenu) { this.cierraMenu = false; return; }
    const p = this.objetivo(e);
    if (!p) return;
    if (p instanceof HTMLAnchorElement && (e.ctrlKey || e.metaKey || e.shiftKey)) this.nuevaPestana(p);
    else p.click();
  }

  protected onAuxClick(e: MouseEvent): void {
    if (e.button !== 1) return;
    const p = this.objetivo(e);
    if (p instanceof HTMLAnchorElement) this.nuevaPestana(p);
  }

  /** Control principal, salvo que se pulse otro control de la fila o se esté seleccionando texto. */
  private objetivo(e: MouseEvent): HTMLElement | null {
    const t = e.target as Element | null;
    if (!t || t.closest(INTERACTIVO)) return null;
    if (document.getSelection()?.toString()) return null;
    return this.row.querySelector<HTMLElement>('[data-row-primary]');
  }

  private nuevaPestana(a: HTMLAnchorElement): void {
    window.open(a.href, '_blank', 'noopener');
  }
}
