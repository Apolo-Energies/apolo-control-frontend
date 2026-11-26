import { ChangeDetectionStrategy, Component, computed, inject, input, model, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';

import { FormDialog } from '../../../shared/components/form-dialog/form-dialog';
import { StatusBadge, StatusTone } from '../../../shared/components/status-badge/status-badge';
import { Icon } from '../../../shared/icons/icon';
import { RowLink } from '../../../shared/directives/row-link';
import { formatDate, formatDateTime, formatEuro } from '../../../shared/utils/format';
import { mensajeError } from '../../../shared/utils/http-error';

import { VibraImpagoService } from '../../../core/services/vibra-impago.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  ESTADO_FACTURA_VIBRA_LABEL,
  MAX_PDF_DEVOLUCIONES_BYTES,
  MOTIVOS_DEVOLUCION_VIBRA,
  RESULTADO_DEVOLUCION_VIBRA_LABEL,
  ResultadoDevolucionVibra,
  VibraDevolucionFilaLeida,
  VibraDevolucionLeida,
  VibraDevolucionLote,
} from '../../../core/models';
import { CellTail } from '../../../shared/components/cell-tail/cell-tail';
import { estadoFacturaTone } from '../facturas/vibra-factura-ui';

/** Fila de la vista previa con lo que el usuario corrige. */
interface FilaEditable {
  leida: VibraDevolucionFilaLeida;
  facturaNumero: string;
  motivo: string;
  aplicar: boolean;
}

/** Devoluciones del banco: subida del PDF «Relación de impagados» con vista previa editable e historial con detalle. */
@Component({
  selector: 'app-vibra-devoluciones-banco',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormDialog, StatusBadge, Icon, CellTail, RowLink],
  templateUrl: './vibra-devoluciones-banco.html',
})
export class VibraDevolucionesBanco {
  private readonly service = inject(VibraImpagoService);
  private readonly notify = inject(NotificationService);

  /** Diálogo de subida abierto (lo abre el botón de la cabecera de Impagos). */
  readonly subirAbierto = model(false);
  /** Puede leer y aplicar (ADMIN, CONTABILIDAD). */
  readonly puedeAplicar = input(false);
  /** Tras aplicar un PDF: la lista de impagos cambia. */
  readonly aplicado = output<void>();

  protected readonly fmtEur = formatEuro;
  protected readonly fmtFecha = formatDate;
  protected readonly fmtFechaHora = formatDateTime;
  protected readonly motivos = MOTIVOS_DEVOLUCION_VIBRA;
  protected readonly estadoFactura = ESTADO_FACTURA_VIBRA_LABEL;
  protected readonly facturaTone = estadoFacturaTone;
  protected readonly resultadoLabel = RESULTADO_DEVOLUCION_VIBRA_LABEL;

  // Historial
  protected readonly lotes = signal<VibraDevolucionLote[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly detalle = signal<VibraDevolucionLote | null>(null);
  protected readonly detalleAbierto = signal(false);

  // Subida
  protected readonly archivo = signal<File | null>(null);
  protected readonly leyendo = signal(false);
  protected readonly leida = signal<VibraDevolucionLeida | null>(null);
  protected readonly filas = signal<FilaEditable[]>([]);
  protected readonly confirmar = signal(false);
  protected readonly aplicando = signal(false);
  protected readonly errorSubida = signal<string | null>(null);

  protected readonly conFactura = computed(() => this.filas().filter((f) => f.aplicar && f.facturaNumero.trim()).length);
  protected readonly sinCasar = computed(() => this.filas().filter((f) => f.aplicar && !f.facturaNumero.trim()).length);
  protected readonly puedeAplicarAhora = computed(() => {
    const l = this.leida();
    return !!l && this.puedeAplicar() && this.filas().some((f) => f.aplicar) && (l.cuadra || this.confirmar());
  });

  protected readonly subtituloDetalle = computed(() => {
    const d = this.detalle();
    if (!d) return null;
    const adeudos = d.adeudos ?? d.lineas.length;
    return `Liquidación del ${formatDate(d.fechaLiquidacion)} · ${adeudos} adeudos · ${formatEuro(d.importeTotal ?? d.sumaLeida)}`
      + ` · procesado el ${formatDateTime(d.createdAt)}${d.usuario ? ' por ' + d.usuario : ''}`;
  });

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.service.devoluciones().subscribe({
      next: (l) => { this.lotes.set(l); this.cargando.set(false); },
      error: (err: HttpErrorResponse) => {
        this.error.set(mensajeError(err, 'No se pudo cargar el historial de devoluciones'));
        this.cargando.set(false);
      },
    });
  }

  protected verDetalle(id: string): void {
    this.detalle.set(null);
    this.detalleAbierto.set(true);
    this.service.devolucion(id).subscribe({
      next: (d) => this.detalle.set(d),
      error: (err: HttpErrorResponse) => {
        this.detalleAbierto.set(false);
        this.notify.error(mensajeError(err, 'No se pudo cargar el detalle'));
      },
    });
  }

  // ── Subida ────────────────────────────────────────────────────────────────

  protected elegir(input: HTMLInputElement): void {
    this.reiniciarSubida();
    this.archivo.set(input.files?.[0] ?? null);
  }

  protected leer(): void {
    const file = this.archivo();
    if (!file || this.leyendo()) return;
    if (file.size > MAX_PDF_DEVOLUCIONES_BYTES) {
      this.errorSubida.set('El PDF pasa de 10 MB');
      return;
    }
    this.leyendo.set(true);
    this.errorSubida.set(null);
    this.service.leerDevoluciones(file).subscribe({
      next: (l) => {
        this.leida.set(l);
        this.filas.set(l.filas.map((f) => ({
          leida: f,
          facturaNumero: f.factura?.numero ?? f.facturaLeida ?? '',
          motivo: f.motivo ?? '',
          // Casada solo por importe y titular: la confirma el usuario
          aplicar: f.casadaPor !== 'IMPORTE_TITULAR',
        })));
        this.leyendo.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorSubida.set(mensajeError(err, 'No se pudo leer el PDF'));
        this.leyendo.set(false);
      },
    });
  }

  protected cambiar(i: number, cambio: Partial<FilaEditable>): void {
    this.filas.update((lista) => lista.map((f, j) => (j === i ? { ...f, ...cambio } : f)));
  }

  /** El nº de factura ya no es el de la factura encontrada: se comprueba al aplicar. */
  protected editada(f: FilaEditable): boolean {
    return f.facturaNumero.trim() !== (f.leida.factura?.numero ?? '');
  }

  protected aplicar(): void {
    const l = this.leida();
    if (!l || !this.puedeAplicarAhora() || this.aplicando()) return;
    this.aplicando.set(true);
    this.errorSubida.set(null);
    this.service.aplicarDevoluciones({
      sha256: l.sha256,
      firma: l.firma,
      archivo: l.archivo,
      fechaLiquidacion: l.fechaLiquidacion,
      adeudosDeclarados: l.adeudosDeclarados,
      totalDeclarado: l.totalDeclarado,
      confirmar: this.confirmar(),
      filas: this.filas().map((f) => ({
        titular: f.leida.titular,
        ibanEnmascarado: f.leida.ibanEnmascarado,
        importe: f.leida.importe,
        vencimiento: f.leida.vencimiento,
        facturaNumero: f.facturaNumero.trim() || null,
        motivoCodigo: f.motivo.trim() === (f.leida.motivo ?? '') ? f.leida.motivoCodigo : null,
        motivo: f.motivo.trim() || null,
        aplicar: f.aplicar,
      })),
    }).subscribe({
      next: (lote) => {
        this.aplicando.set(false);
        this.notify.success(`${lote.marcadas} facturas marcadas devueltas · ${lote.sinCasar} sin casar`);
        this.cerrarSubida();
        this.cargar();
        this.aplicado.emit();
        this.detalle.set(lote);
        this.detalleAbierto.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.aplicando.set(false);
        this.errorSubida.set(mensajeError(err, 'No se pudo aplicar'));
      },
    });
  }

  protected cerrarSubida(): void {
    this.subirAbierto.set(false);
    this.reiniciarSubida();
  }

  private reiniciarSubida(): void {
    this.archivo.set(null);
    this.leida.set(null);
    this.filas.set([]);
    this.confirmar.set(false);
    this.errorSubida.set(null);
  }

  protected resultadoTone(r: ResultadoDevolucionVibra): StatusTone {
    if (r === 'MARCADA') return 'success';
    if (r === 'YA_DEVUELTA') return 'info';
    if (r === 'SIN_CASAR') return 'warning';
    return 'neutral';
  }
}
