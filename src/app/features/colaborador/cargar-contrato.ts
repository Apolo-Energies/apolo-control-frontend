import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { PageHeader } from '../../shared/components/page-header/page-header';
import { Icon } from '../../shared/icons/icon';
import { VibraPortalService } from '../../core/services/vibra-portal.service';
import { NotificationService } from '../../core/services/notification.service';
import { COMERCIALIZADORA_VIBRA_VALUES, PortalContratoRequest, PortalProducto } from '../../core/models';
import { mensajeError } from '../../shared/utils/http-error';

type Potencia = 'potenciaP1' | 'potenciaP2' | 'potenciaP3' | 'potenciaP4' | 'potenciaP5' | 'potenciaP6';

/** Cargar contrato: el alta queda a nombre del colaborador y pendiente de firma. */
@Component({
  selector: 'app-cargar-contrato',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, PageHeader, Icon],
  templateUrl: './cargar-contrato.html',
})
export class CargarContrato {
  private readonly service = inject(VibraPortalService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly productos = signal<PortalProducto[]>([]);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly comercializadoras = COMERCIALIZADORA_VIBRA_VALUES;
  protected readonly potencias: { campo: Potencia; label: string }[] = [1, 2, 3, 4, 5, 6]
    .map((n) => ({ campo: `potenciaP${n}` as Potencia, label: `P${n}` }));

  protected m: PortalContratoRequest = {
    titular: '', nifCif: '', telefono: null, email: null,
    cups: '', direccionSuministro: '', poblacion: null, provincia: null,
    potenciaP1: null, potenciaP2: null, potenciaP3: null, potenciaP4: null, potenciaP5: null, potenciaP6: null,
    comercializadora: null, cuentaBancaria: '', tarifaId: null,
  };

  constructor() {
    this.service.productos().subscribe({
      next: (p) => this.productos.set(p),
      error: () => this.productos.set([]),
    });
  }

  protected guardar(): void {
    this.saving.set(true);
    this.error.set(null);
    this.service.cargarContrato(this.m).subscribe({
      next: (c) => {
        this.notify.success(`Contrato de ${c.titular} cargado: pendiente de firma`);
        void this.router.navigate(['/colaborador/contratos', c.id]);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(mensajeError(err, 'No se pudo cargar el contrato'));
      },
    });
  }
}
