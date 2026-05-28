import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  AutoComplete,
  AutoCompleteCompleteEvent,
  AutoCompleteSelectEvent,
} from 'primeng/autocomplete';
import { PrimeTemplate } from 'primeng/api';
import { Observable } from 'rxjs';

export interface RemoteOption {
  id: string;
  label: string;
  sublabel?: string;
}

/**
 * Selector con búsqueda remota (autocompletado) para listas grandes (N clientes, CUPS…).
 * Integra con Reactive Forms vía ControlValueAccessor: el form recibe el `id` seleccionado.
 *
 * Uso:
 *   <app-remote-select
 *     formControlName="clienteId"
 *     placeholder="Busca un cliente…"
 *     [searchFn]="searchClientes"
 *   />
 *
 * donde searchClientes = (q: string) => Observable<RemoteOption[]>
 */
@Component({
  selector: 'app-remote-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, AutoComplete, PrimeTemplate],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => RemoteSelect), multi: true },
  ],
  templateUrl: './remote-select.html',
})
export class RemoteSelect implements ControlValueAccessor {
  readonly searchFn = input.required<(query: string) => Observable<RemoteOption[]>>();
  readonly placeholder = input<string>('Buscar…');
  readonly minLength = input<number>(0);
  readonly scrollHeight = input<string>('260px');

  protected readonly suggestions = signal<RemoteOption[]>([]);
  protected readonly loading = signal(false);
  protected selectedModel: RemoteOption | null = null;
  protected disabled = false;

  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  protected search(event: AutoCompleteCompleteEvent): void {
    this.loading.set(true);
    this.searchFn()(event.query).subscribe({
      next: (opts) => {
        this.suggestions.set(opts);
        this.loading.set(false);
      },
      error: () => {
        this.suggestions.set([]);
        this.loading.set(false);
      },
    });
  }

  protected onSelect(event: AutoCompleteSelectEvent): void {
    const opt = event.value as RemoteOption | null;
    this.selectedModel = opt;
    this.onChange(opt?.id ?? null);
    this.onTouched();
  }

  protected onClear(): void {
    this.selectedModel = null;
    this.onChange(null);
    this.onTouched();
  }

  // ── ControlValueAccessor ──
  writeValue(value: string | null): void {
    if (!value) {
      this.selectedModel = null;
    }
    // Los formularios de creación inician vacíos, por lo que no necesitamos
    // resolver el label de un id preexistente.
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
