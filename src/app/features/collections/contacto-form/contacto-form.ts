import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Icon, IconName } from '../../../shared/icons/icon';
import { RESULTADO_LLAMADA_OPTIONS } from '../../../core/models';

/**
 * Valor del formulario de contacto de impago. Se muta en sitio (referencia compartida con el host),
 * así que el host lee estos campos directamente al guardar.
 */
export interface ContactoFormValue {
  actionKey: string;
  notes: string;
  resultadoLlamada: string;
  promesaFecha: string;
  promesaImporte: string;
  targetStep: number;
}

const CONTACTO_ACTIONS: { key: string; label: string; icon: IconName }[] = [
  { key: 'llamada',     label: 'Llamada',     icon: 'phone' },
  { key: 'email',       label: 'Email',       icon: 'mail' },
  { key: 'whatsapp',    label: 'WhatsApp',    icon: 'message-square' },
  { key: 'aviso_corte', label: 'Aviso corte', icon: 'scissors' },
  { key: 'promesa',     label: 'Promesa',     icon: 'calendar-check' },
  { key: 'otro',        label: 'Otro',        icon: 'more-horizontal' },
];

const STEP_ACTIONS: Record<number, string[]> = {
  1: ['llamada', 'whatsapp', 'promesa'],
  2: ['llamada', 'whatsapp', 'email', 'promesa', 'otro'],
  3: ['llamada', 'whatsapp', 'email', 'aviso_corte', 'promesa', 'otro'],
  4: ['aviso_corte', 'llamada', 'promesa'],
  5: ['llamada', 'whatsapp', 'email', 'promesa'],
};

/** Acciones disponibles para un paso dado (1-5). */
export function contactoAccionesPaso(step: number): string[] {
  return STEP_ACTIONS[step] ?? ['llamada'];
}

/** Valor inicial del formulario para un paso: la primera acción permitida y campos vacíos. */
export function emptyContactoForm(targetStep: number): ContactoFormValue {
  return {
    actionKey: contactoAccionesPaso(targetStep)[0] ?? 'llamada',
    notes: '',
    resultadoLlamada: '',
    promesaFecha: '',
    promesaImporte: '',
    targetStep,
  };
}

/** Importe en formato ES/EN ("1.234,56" o "1234.56") → número; null si vacío/ inválido. */
export function parseContactoImporte(value: string | null | undefined): number | null {
  const s = (value ?? '').toString().trim();
  if (!s) return null;
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  const normalized = lastComma > lastDot
    ? s.replace(/\./g, '').replace(',', '.')
    : s.replace(/,/g, '');
  const n = parseFloat(normalized);
  return isNaN(n) ? null : n;
}

/**
 * Cuerpo del formulario de registrar contacto de impago (pills + secciones condicionales +
 * resultado de llamada + notas). Fuente ÚNICA usada por el listado inline (unpaid) y el
 * detalle (unpaid-detail). El header y los botones Guardar/Cancelar los pone cada host.
 */
@Component({
  selector: 'app-contacto-form',
  standalone: true,
  imports: [FormsModule, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contacto-form.html',
})
export class ContactoFormComponent {
  /** Objeto mutado en sitio (el host conserva la referencia y lee los campos al guardar). */
  readonly value = input.required<ContactoFormValue>();
  /** Tamaños compactos para el listado inline (en el detalle se usan más holgados). */
  readonly compact = input(false);

  protected readonly resultadoLlamadaOptions = RESULTADO_LLAMADA_OPTIONS;

  protected get visibleActions() {
    const keys = contactoAccionesPaso(this.value().targetStep);
    return CONTACTO_ACTIONS.filter(a => keys.includes(a.key));
  }

  protected setAction(key: string): void {
    this.value().actionKey = key;
  }

  protected get inputCls(): string {
    return this.compact() ? 'h-8 px-2 text-xs' : 'h-10 px-3 text-sm';
  }

  protected get labelCls(): string {
    return this.compact() ? 'text-xs text-muted-foreground' : 'text-sm font-medium text-foreground';
  }

  protected get pillTextCls(): string {
    return this.compact() ? 'text-[11px]' : 'text-xs';
  }
}
