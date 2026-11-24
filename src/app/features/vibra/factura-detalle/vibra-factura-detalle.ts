import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { FormDialog } from '../../../shared/components/form-dialog/form-dialog';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { Icon } from '../../../shared/icons/icon';
import { formatDate, formatDateTime, formatEuro, parseDecimal } from '../../../shared/utils/format';
import { mensajeError } from '../../../shared/utils/http-error';

import { AuthService } from '../../../core/auth';
import { VibraFacturaService } from '../../../core/services/vibra-factura.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  ESTADO_FACTURA_VIBRA_LABEL, EstadoFacturaVibra, IVAS_FACTURA_VIBRA, MAX_PDF_COMPRA_BYTES, VibraFactura, VibraFacturaLinea,
  ZonaLineaFacturaVibra,
} from '../../../core/models';
import { abrirBlob, estadoFacturaTone } from '../facturas/vibra-factura-ui';

interface Confirmacion {
  titulo: string;
  mensaje: string;
  label: string;
  tone: 'danger' | 'warning' | 'info';
  accion: () => void;
}

interface LineaForm {
  concepto: string;
  importe: string;
  zona: ZonaLineaFacturaVibra;
  /** '' = sin IVA (no sujeto). */
  iva: string;
}

/** Siguientes estados de cobro desde el actual (como los botones de Kilowy). */
const SIGUIENTES: Partial<Record<EstadoFacturaVibra, { estado: EstadoFacturaVibra; label: string }[]>> = {
  EMITIDA: [{ estado: 'PAGADA', label: 'Marcar pagada' }, { estado: 'IMPAGADA', label: 'Marcar impagada' }],
  PAGADA: [{ estado: 'IMPAGADA', label: 'Marcar impagada' }, { estado: 'EMITIDA', label: 'Volver a emitida' }],
  IMPAGADA: [{ estado: 'PAGADA', label: 'Marcar pagada' }, { estado: 'EMITIDA', label: 'Volver a emitida' }],
  DEVUELTA: [{ estado: 'PAGADA', label: 'Marcar pagada' }, { estado: 'EMITIDA', label: 'Volver a emitida' }],
};

/** Factura Vibra: borrador generado desde la compra (conceptos extra, emitir) o emitida (cobro y envío). */
@Component({
  selector: 'app-vibra-factura-detalle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, PageHeader, FormDialog, ConfirmDialog, StatusBadge, Icon],
  templateUrl: './vibra-factura-detalle.html',
})
export class VibraFacturaDetalle {
  private readonly service = inject(VibraFacturaService);
  private readonly notify = inject(NotificationService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** :id de la ruta (withComponentInputBinding). */
  readonly id = input.required<string>();

  protected readonly puedeEditar = computed(() => this.auth.hasRole('admin', 'contabilidad', 'operaciones'));
  protected readonly puedeBorrar = computed(() => this.auth.hasRole('admin', 'contabilidad'));

  protected readonly factura = signal<VibraFactura | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly ocupado = signal<string | null>(null);
  protected readonly confirmacion = signal<Confirmacion | null>(null);

  protected readonly lineaEdit = signal<{ id: string | null } | null>(null);
  protected linea: LineaForm = lineaVacia();
  protected readonly lineaSaving = signal(false);
  protected readonly lineaError = signal<string | null>(null);

  protected readonly euro = formatEuro;
  protected readonly fecha = formatDate;
  protected readonly fechaHora = formatDateTime;
  protected readonly estadoLabel = ESTADO_FACTURA_VIBRA_LABEL;
  protected readonly tone = estadoFacturaTone;
  protected readonly ivas = IVAS_FACTURA_VIBRA;

  protected readonly esBorrador = computed(() => this.factura()?.estado === 'BORRADOR');
  protected readonly siguientes = computed(() => SIGUIENTES[this.factura()?.estado ?? 'BORRADOR'] ?? []);
  protected readonly lineasCalculo = computed(() => this.factura()?.lineas.filter((l) => l.tipo !== 'OTRO') ?? []);
  protected readonly gruposConceptos = computed(() => {
    const otros = this.factura()?.lineas.filter((l) => l.tipo === 'OTRO') ?? [];
    return [
      { id: 'antes', titulo: 'Dentro de la base del impuesto eléctrico', lineas: otros.filter((l) => l.zona === 'ANTES') },
      { id: 'despues', titulo: 'Después del impuesto eléctrico', lineas: otros.filter((l) => l.zona === 'DESPUES') },
    ];
  });
  protected readonly potencias = computed(() => texto(this.factura()?.potencias, 'kW'));
  protected readonly consumos = computed(() => texto(this.factura()?.consumos, 'kWh'));

  constructor() {
    effect(() => this.load(this.id()));
  }

  private load(id: string): void {
    this.error.set(null);
    this.service.get(id).subscribe({
      next: (f) => this.factura.set(f),
      error: (err: HttpErrorResponse) => this.error.set(mensajeError(err, 'No se pudo cargar la factura')),
    });
  }

  // ── Acciones ──────────────────────────────────────────────────────────────

  private ejecutar(clave: string, obs: Observable<VibraFactura>, ok: string): void {
    this.ocupado.set(clave);
    obs.subscribe({
      next: (f) => { this.ocupado.set(null); this.confirmacion.set(null); this.factura.set(f); this.notify.success(ok); },
      error: (err: HttpErrorResponse) => {
        this.ocupado.set(null);
        this.confirmacion.set(null);
        this.notify.error(mensajeError(err, 'No se pudo completar la acción'));
      },
    });
  }

  protected verPdf(): void {
    this.service.pdf(this.id()).subscribe({ next: abrirBlob, error: () => this.notify.error('No se pudo generar el PDF') });
  }

  protected verCompra(): void {
    this.service.compraPdf(this.id()).subscribe({ next: abrirBlob, error: () => this.notify.error('No se pudo abrir la compra') });
  }

  protected subirCompra(input: HTMLInputElement): void {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > MAX_PDF_COMPRA_BYTES) { this.notify.error('El PDF pasa de 10 MB'); return; }
    this.ejecutar('compra', this.service.releer(this.id(), file), 'Compra leída: borrador regenerado');
  }

  protected releer(): void {
    this.confirmacion.set({
      titulo: 'Re-leer la compra',
      mensaje: 'Se vuelve a leer la factura de compra y se regeneran los conceptos automáticos. Los conceptos añadidos a mano se conservan.',
      label: 'Re-leer', tone: 'info',
      accion: () => this.ejecutar('releer', this.service.releer(this.id()), 'Compra re-leída: borrador regenerado'),
    });
  }

  protected emitir(): void {
    const f = this.factura();
    if (!f) return;
    const avisos = f.avisos.length ? ` Hay ${f.avisos.length} ${f.avisos.length === 1 ? 'aviso' : 'avisos'} sin revisar.` : '';
    this.confirmacion.set({
      titulo: 'Emitir factura',
      mensaje: `Se asigna número y fecha de emisión de hoy por ${formatEuro(f.total)}. Una factura emitida ya no se puede cambiar.${avisos}`,
      label: 'Emitir', tone: 'warning',
      accion: () => this.ejecutar('emitir', this.service.emitir(this.id()), 'Factura emitida'),
    });
  }

  protected enviar(): void {
    const f = this.factura();
    if (!f) return;
    this.confirmacion.set({
      titulo: 'Enviar por correo',
      mensaje: `Se envía el PDF de la factura a ${f.email}.${f.enviadaAt ? ' Ya se envió el ' + formatDateTime(f.enviadaAt) + '.' : ''}`,
      label: 'Enviar', tone: 'info',
      accion: () => this.ejecutar('enviar', this.service.enviar(this.id()), 'Factura enviada'),
    });
  }

  protected cambiarEstado(estado: EstadoFacturaVibra): void {
    this.ejecutar('estado', this.service.cambiarEstado(this.id(), estado), `Factura ${ESTADO_FACTURA_VIBRA_LABEL[estado].toLowerCase()}`);
  }

  protected borrar(): void {
    this.confirmacion.set({
      titulo: 'Borrar borrador',
      mensaje: 'Se borra el borrador y su factura de compra. Podrás generarlo de nuevo subiendo la compra.',
      label: 'Borrar', tone: 'danger',
      accion: () => {
        this.ocupado.set('borrar');
        this.service.borrar(this.id()).subscribe({
          next: () => { this.ocupado.set(null); this.confirmacion.set(null); this.notify.success('Borrador borrado'); void this.router.navigate(['/vibra/facturas']); },
          error: (err: HttpErrorResponse) => { this.ocupado.set(null); this.confirmacion.set(null); this.notify.error(mensajeError(err, 'No se pudo borrar')); },
        });
      },
    });
  }

  // ── Conceptos extra ───────────────────────────────────────────────────────

  protected abrirLinea(l: VibraFacturaLinea | null): void {
    this.linea = l
      ? { concepto: l.concepto, importe: String(l.importe).replace('.', ','), zona: l.zona, iva: l.ivaPct === null ? '' : String(l.ivaPct) }
      : lineaVacia();
    this.lineaError.set(null);
    this.lineaEdit.set({ id: l?.id ?? null });
  }

  protected importeValido(): boolean {
    const n = parseDecimal(this.linea.importe);
    return n !== null && !Number.isNaN(n) && n !== 0;
  }

  protected guardarLinea(): void {
    const edit = this.lineaEdit();
    if (!edit || !this.linea.concepto.trim() || !this.importeValido()) {
      this.lineaError.set('Error: escribe el concepto y un importe distinto de 0 (negativo para un descuento).');
      return;
    }
    const payload = {
      concepto: this.linea.concepto.trim(),
      importe: parseDecimal(this.linea.importe) as number,
      zona: this.linea.zona,
      ivaPct: this.linea.zona === 'ANTES' ? 21 : this.linea.iva === '' ? null : Number(this.linea.iva),
    };
    this.lineaSaving.set(true);
    const obs = edit.id ? this.service.updateLinea(this.id(), edit.id, payload) : this.service.addLinea(this.id(), payload);
    obs.subscribe({
      next: (f) => { this.lineaSaving.set(false); this.lineaEdit.set(null); this.factura.set(f); },
      error: (err: HttpErrorResponse) => { this.lineaSaving.set(false); this.lineaError.set(mensajeError(err, 'No se pudo guardar el concepto')); },
    });
  }

  protected quitarLinea(l: VibraFacturaLinea): void {
    this.ejecutar('linea', this.service.deleteLinea(this.id(), l.id), `Concepto «${l.concepto}» quitado`);
  }

  protected ivaTexto(l: VibraFacturaLinea): string {
    return l.ivaPct === null ? 'Sin IVA (no sujeto)' : `IVA ${l.ivaPct} %`;
  }
}

function lineaVacia(): LineaForm {
  return { concepto: '', importe: '', zona: 'DESPUES', iva: '21' };
}

function texto(valores: (number | null)[] | undefined, unidad: string): string {
  const partes = (valores ?? []).map((v, i) => (v ? `P${i + 1} ${String(v).replace('.', ',')} ${unidad}` : null)).filter(Boolean);
  return partes.length ? partes.join(' · ') : '—';
}
