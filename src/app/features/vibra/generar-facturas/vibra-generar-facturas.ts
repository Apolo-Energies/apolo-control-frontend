import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { Icon } from '../../../shared/icons/icon';
import { mensajeError } from '../../../shared/utils/http-error';

import { VibraFacturaService } from '../../../core/services/vibra-factura.service';
import { MAX_PDF_COMPRA_BYTES, ResultadoCompraVibra } from '../../../core/models';

/**
 * «Generar facturas» (como Lotes de Kilowy): se suben los PDF de compra de la comercializadora y
 * cada uno se lee con el OCR y crea su borrador. Se mandan de uno en uno para ver el avance.
 */
@Component({
  selector: 'app-vibra-generar-facturas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeader, StatusBadge, Icon],
  templateUrl: './vibra-generar-facturas.html',
})
export class VibraGenerarFacturas {
  private readonly service = inject(VibraFacturaService);

  protected readonly archivos = signal<File[]>([]);
  protected readonly resultados = signal<ResultadoCompraVibra[]>([]);
  protected readonly procesando = signal(false);
  protected readonly hechos = computed(() => this.resultados().length);
  protected readonly creados = computed(() => this.resultados().filter((r) => r.facturaId).length);
  protected readonly errores = computed(() => this.resultados().filter((r) => r.error).length);

  protected elegir(input: HTMLInputElement): void {
    this.archivos.set(Array.from(input.files ?? []));
    this.resultados.set([]);
  }

  protected async procesar(input: HTMLInputElement): Promise<void> {
    const files = this.archivos();
    if (!files.length || this.procesando()) return;
    this.procesando.set(true);
    this.resultados.set([]);
    for (const file of files) {
      const r = await this.uno(file);
      this.resultados.update((lista) => [...lista, r]);
    }
    this.procesando.set(false);
    input.value = '';
    this.archivos.set([]);
  }

  private async uno(file: File): Promise<ResultadoCompraVibra> {
    const fallo = (error: string): ResultadoCompraVibra => ({ archivo: file.name, facturaId: null, titular: null, cups: null, error });
    if (file.size > MAX_PDF_COMPRA_BYTES) return fallo('El PDF pasa de 10 MB');
    try {
      const [r] = await firstValueFrom(this.service.generar(file));
      return r ?? fallo('Sin respuesta del servidor');
    } catch (err) {
      return fallo(mensajeError(err as HttpErrorResponse, 'No se pudo procesar'));
    }
  }
}
