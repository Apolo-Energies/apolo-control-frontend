import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';

import { PageHeader } from '../../shared/components/page-header/page-header';
import { StatusBadge } from '../../shared/components/status-badge/status-badge';
import { Icon } from '../../shared/icons/icon';
import { VibraPortalService } from '../../core/services/vibra-portal.service';
import { PortalContrato } from '../../core/models';
import { formatDate } from '../../shared/utils/format';
import { mensajeError } from '../../shared/utils/http-error';
import { estadoAltaLabel, estadoAltaTone } from '../vibra/altas/vibra-alta-ui';

/** Detalle de uno de mis contratos (solo lectura). */
@Component({
  selector: 'app-contrato-detalle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeader, StatusBadge, Icon],
  templateUrl: './contrato-detalle.html',
})
export class ContratoDetalle {
  private readonly service = inject(VibraPortalService);

  /** Parámetro de ruta. */
  readonly id = input.required<string>();

  protected readonly contrato = signal<PortalContrato | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly potencias = computed(() => {
    const c = this.contrato();
    if (!c) return [];
    return [c.potenciaP1, c.potenciaP2, c.potenciaP3, c.potenciaP4, c.potenciaP5, c.potenciaP6]
      .map((v, i) => ({ periodo: `P${i + 1}`, valor: v }))
      .filter((p) => p.valor !== null);
  });

  /** Hitos del contrato; Baja solo si la hay. */
  protected readonly fechas = computed(() => {
    const c = this.contrato();
    if (!c) return [];
    const f = [
      { label: 'Alta', valor: c.fecha },
      { label: 'Firma', valor: c.fechaFirma },
      { label: 'Activación', valor: c.fechaActivacionContrato },
    ];
    return c.fechaBaja ? [...f, { label: 'Baja', valor: c.fechaBaja }] : f;
  });

  constructor() {
    effect(() => {
      const id = this.id();
      this.contrato.set(null);
      this.error.set(null);
      this.service.contrato(id).subscribe({
        next: (c) => this.contrato.set(c),
        error: (err: HttpErrorResponse) => this.error.set(mensajeError(err, 'No se pudo cargar el contrato')),
      });
    });
  }

  protected readonly fecha = formatDate;
  protected readonly estadoLabel = estadoAltaLabel;
  protected readonly estadoTone = estadoAltaTone;
}
