import { ChangeDetectionStrategy, ChangeDetectorRef, Component, effect, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { FormDialog } from '../../../shared/components/form-dialog/form-dialog';
import { VibraClienteService } from '../../../core/services/vibra-cliente.service';
import { VibraClienteFicha, VibraClientePayload } from '../../../core/models';
import { mensajeError } from '../../../shared/utils/http-error';

const VACIO: VibraClientePayload = {
  tipo: 'FISICA', nif: '', nombre: '', telefono1: null, telefono2: null, email: null,
  tipoVia: null, via: null, numero: null, escalera: null, piso: null, puerta: null,
  cp: null, poblacion: null, provincia: null, observaciones: null,
};

/** Alta (cliente null) o edición de un cliente Vibra, como «Editar cliente» de Kilowy. */
@Component({
  selector: 'app-vibra-cliente-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, FormDialog],
  templateUrl: './vibra-cliente-form.html',
})
export class VibraClienteForm {
  private readonly service = inject(VibraClienteService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly open = input.required<boolean>();
  readonly cliente = input<VibraClienteFicha | null>(null);
  readonly saved = output<VibraClienteFicha>();
  readonly cancel = output<void>();

  protected readonly tiposVia = ['Calle', 'Avenida', 'Plaza', 'Paseo', 'Camino', 'Carretera', 'Travesía',
    'Ronda', 'Urbanización', 'Polígono', 'Partida', 'Otra'];
  protected m: VibraClientePayload = { ...VACIO };
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    // Al abrir: datos del cliente o formulario vacío
    effect(() => {
      if (!this.open()) return;
      const c = this.cliente();
      this.m = c ? pick(c) : { ...VACIO };
      this.error.set(null);
      this.cdr.markForCheck();
    });
  }

  protected guardar(): void {
    this.saving.set(true);
    this.error.set(null);
    const c = this.cliente();
    const obs = c ? this.service.update(c.id, this.m) : this.service.create(this.m);
    obs.subscribe({
      next: (r) => { this.saving.set(false); this.saved.emit(r); },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(mensajeError(err, 'No se pudo guardar'));
      },
    });
  }
}

function pick(c: VibraClienteFicha): VibraClientePayload {
  const { tipo, nif, nombre, telefono1, telefono2, email, tipoVia, via, numero, escalera, piso, puerta,
    cp, poblacion, provincia, observaciones } = c;
  return { tipo, nif, nombre, telefono1, telefono2, email, tipoVia, via, numero, escalera, piso, puerta,
    cp, poblacion, provincia, observaciones };
}
