import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { FormDialog } from '../../../shared/components/form-dialog/form-dialog';
import { StatusBadge, StatusTone } from '../../../shared/components/status-badge/status-badge';
import { TableSkeleton } from '../../../shared/components/table-skeleton/table-skeleton';
import { Icon } from '../../../shared/icons/icon';
import { formatDate, formatEuro } from '../../../shared/utils/format';

import { AuthService } from '../../../core/auth';
import { VibraClienteService } from '../../../core/services/vibra-cliente.service';
import { VibraFacturaService } from '../../../core/services/vibra-factura.service';
import { ESTADO_FACTURA_VIBRA_LABEL, VibraFacturaListItem } from '../../../core/models';
import { estadoFacturaTone } from '../facturas/vibra-factura-ui';
import { NotificationService } from '../../../core/services/notification.service';
import {
  ESTADO_VIBRA_ALTA_LABEL, EstadoVibraAlta, TIPO_CLIENTE_VIBRA_LABEL, TIPO_SUMINISTRO_VIBRA_LABEL,
  VibraClienteFicha, VibraSuministro, VibraSuministroPayload,
} from '../../../core/models';
import { mensajeError } from '../../../shared/utils/http-error';
import { VibraClienteForm } from '../clientes/vibra-cliente-form';

type Pestana = 'datos' | 'suministros' | 'contratos' | 'facturas';

/** Ficha del cliente Vibra (como la de Kilowy): Datos, Suministros y Contratos. */
@Component({
  selector: 'app-vibra-cliente-ficha',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, PageHeader, FormDialog, StatusBadge, TableSkeleton, Icon, VibraClienteForm],
  templateUrl: './vibra-cliente-ficha.html',
})
export class VibraClienteFichaView {
  private readonly service = inject(VibraClienteService);
  private readonly notify = inject(NotificationService);
  private readonly auth = inject(AuthService);
  private readonly facturaService = inject(VibraFacturaService);

  /** :id de la ruta (withComponentInputBinding). */
  readonly id = input.required<string>();

  protected readonly puedeEditar = computed(() => this.auth.hasRole('admin', 'operaciones'));
  /** Mismos roles que la pantalla de Facturas. */
  protected readonly verFacturas = this.auth.hasRole('admin', 'contabilidad', 'operaciones');
  protected readonly facturas = signal<VibraFacturaListItem[] | null>(null);
  protected readonly euro = formatEuro;
  protected readonly estadoFactura = ESTADO_FACTURA_VIBRA_LABEL;
  protected readonly toneFactura = estadoFacturaTone;
  protected readonly ficha = signal<VibraClienteFicha | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly tab = signal<Pestana>('datos');
  protected readonly editOpen = signal(false);

  // Diálogo de suministro: null cerrado; id null = nuevo
  protected readonly sumEdit = signal<{ id: string | null } | null>(null);
  protected sum: VibraSuministroPayload = vacio();
  protected readonly sumSaving = signal(false);
  protected readonly sumError = signal<string | null>(null);

  protected readonly fecha = formatDate;
  protected readonly tipoCliente = TIPO_CLIENTE_VIBRA_LABEL;
  protected readonly tipoSuministro = TIPO_SUMINISTRO_VIBRA_LABEL;

  protected estadoLabel(estado: string | null): string {
    return estado ? (ESTADO_VIBRA_ALTA_LABEL[estado as EstadoVibraAlta] ?? estado) : '—';
  }
  protected readonly direccion = computed(() => {
    const f = this.ficha();
    if (!f) return '—';
    const calle = [f.tipoVia, f.via, f.numero].filter(Boolean).join(' ');
    const resto = [f.escalera && `esc. ${f.escalera}`, f.piso && `piso ${f.piso}`, f.puerta && `pta. ${f.puerta}`].filter(Boolean).join(', ');
    const lugar = [f.cp, f.poblacion, f.provincia && `(${f.provincia})`].filter(Boolean).join(' ');
    return [calle, resto, lugar].filter(Boolean).join(' · ') || '—';
  });

  constructor() {
    effect(() => this.load(this.id()));
  }

  private load(id: string): void {
    this.error.set(null);
    this.service.ficha(id).subscribe({
      next: (f) => {
        this.ficha.set(f);
        this.loadFacturas(f.nif);
      },
      error: (err: HttpErrorResponse) => this.error.set(err.error?.message ?? 'No se pudo cargar el cliente'),
    });
  }

  /** Facturas del cliente por su DNI/CIF (como la pestaña Facturación del contrato en Kilowy). */
  private loadFacturas(nif: string): void {
    if (!this.verFacturas) return;
    this.facturaService.list({ q: nif }, { size: 200, sort: 'fechaEmision,desc' }).subscribe({
      next: (r) => this.facturas.set(r.content),
      error: () => this.facturas.set([]),
    });
  }

  protected guardado(f: VibraClienteFicha): void {
    this.editOpen.set(false);
    this.ficha.set(f);
    this.notify.success('Cliente guardado');
  }

  protected abrirSuministro(s: VibraSuministro | null): void {
    this.sum = s ? { cups: s.cups, tipo: s.tipo, tarifaAcceso: s.tarifaAcceso, direccion: s.direccion,
      cp: s.cp, poblacion: s.poblacion, provincia: s.provincia } : vacio();
    this.sumError.set(null);
    this.sumEdit.set({ id: s?.id ?? null });
  }

  protected guardarSuministro(): void {
    const f = this.ficha();
    const edit = this.sumEdit();
    if (!f || !edit) return;
    this.sumSaving.set(true);
    const obs = edit.id ? this.service.updateSuministro(edit.id, this.sum) : this.service.createSuministro(f.id, this.sum);
    obs.subscribe({
      next: (r) => {
        this.sumSaving.set(false);
        this.sumEdit.set(null);
        this.ficha.set(r);
        this.notify.success('Suministro guardado');
      },
      error: (err: HttpErrorResponse) => {
        this.sumSaving.set(false);
        this.sumError.set(mensajeError(err, 'No se pudo guardar'));
      },
    });
  }

  protected estadoTone(estado: string | null): StatusTone {
    switch (estado) {
      case 'ACTIVO': return 'success';
      case 'BAJA': case 'CANCELADO': return 'danger';
      case 'FIRMADO': case 'TRAMITADO': return 'info';
      default: return 'neutral';
    }
  }
}

function vacio(): VibraSuministroPayload {
  return { cups: '', tipo: 'LUZ', tarifaAcceso: '2.0TD', direccion: null, cp: null, poblacion: null, provincia: null };
}
