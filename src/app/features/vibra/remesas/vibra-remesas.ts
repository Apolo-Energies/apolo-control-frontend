import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { TableSkeleton } from '../../../shared/components/table-skeleton/table-skeleton';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { Icon } from '../../../shared/icons/icon';
import { formatDate, formatEuro } from '../../../shared/utils/format';
import { mensajeError } from '../../../shared/utils/http-error';

import { AuthService } from '../../../core/auth';
import { VibraRemesaService } from '../../../core/services/vibra-remesa.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  ESTADO_FACTURA_VIBRA_LABEL, ESTADO_REMESA_VIBRA_LABEL, TIPO_REMESA_VIBRA_LABEL, TipoRemesaVibra,
  VibraRemesaCobrable, VibraRemesaGrupo, VibraRemesaListItem, VibraRemesaPendientes,
} from '../../../core/models';
import { descargarXml, estadoRemesaTone, fechaMadrid } from './vibra-remesa-ui';

type Pestana = 'PENDIENTES' | 'REGIRO' | 'GENERADAS';

const PESTANAS: { id: Pestana; label: string }[] = [
  { id: 'PENDIENTES', label: 'Pendientes de cobro' },
  { id: 'REGIRO', label: 'Regiro de impagados' },
  { id: 'GENERADAS', label: 'Generadas' },
];

/** Remesas SEPA de Vibra (como Remesas de Kilowy): pendientes por fecha de cobro, regiro y generadas. */
@Component({
  selector: 'app-vibra-remesas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, FormsModule, RouterLink, PageHeader, TableSkeleton, StatusBadge, ConfirmDialog, Icon],
  templateUrl: './vibra-remesas.html',
})
export class VibraRemesas {
  private readonly service = inject(VibraRemesaService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  protected readonly pestanas = PESTANAS;
  protected readonly tipoLabel = TIPO_REMESA_VIBRA_LABEL;
  protected readonly estadoLabel = ESTADO_REMESA_VIBRA_LABEL;
  protected readonly estadoFacturaLabel = ESTADO_FACTURA_VIBRA_LABEL;
  protected readonly estadoTone = estadoRemesaTone;
  protected readonly euro = formatEuro;
  protected readonly fecha = formatDate;
  /** Generar, descargar y anular: admin y contabilidad. Operaciones solo ve. */
  protected readonly puedeGestionar = this.auth.hasRole('admin', 'contabilidad');
  protected readonly manana = fechaMadrid(1);

  protected readonly tab = signal<Pestana>('PENDIENTES');
  protected readonly pendientes = signal<VibraRemesaPendientes | null>(null);
  protected readonly regirables = signal<VibraRemesaPendientes | null>(null);
  protected readonly remesas = signal<VibraRemesaListItem[] | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly ocupado = signal<string | null>(null);
  protected readonly filtroTipo = signal<TipoRemesaVibra | ''>('');
  protected readonly anulando = signal<VibraRemesaListItem | null>(null);

  /** Facturas marcadas para la remesa (pendientes y regiro por separado). */
  protected readonly marcadas = signal<ReadonlySet<string>>(new Set());
  protected readonly marcadasRegiro = signal<ReadonlySet<string>>(new Set());
  protected fechaRegiro = fechaMadrid(1);

  protected readonly totalPendientes = computed(() =>
    (this.pendientes()?.grupos ?? []).reduce((n, g) => n + g.recibos, 0));
  protected readonly importePendientes = computed(() =>
    (this.pendientes()?.grupos ?? []).reduce((n, g) => n + g.importe, 0));
  protected readonly facturasRegiro = computed(() => this.regirables()?.grupos[0]?.facturas ?? []);
  protected readonly seleccionRegiro = computed(() => {
    const m = this.marcadasRegiro();
    const sel = this.facturasRegiro().filter((f) => m.has(f.facturaId));
    return { n: sel.length, importe: sel.reduce((s, f) => s + f.importe, 0) };
  });
  protected readonly remesasFiltradas = computed(() => {
    const t = this.filtroTipo();
    return (this.remesas() ?? []).filter((r) => !t || r.tipo === t);
  });
  protected readonly conteos = computed<Record<Pestana, number | undefined>>(() => ({
    PENDIENTES: this.pendientes() ? this.totalPendientes() : undefined,
    REGIRO: this.regirables() ? this.facturasRegiro().length : undefined,
    GENERADAS: this.remesas()?.length,
  }));

  constructor() { this.load(); }

  protected load(): void {
    this.error.set(null);
    const fallo = (err: HttpErrorResponse) => this.error.set(mensajeError(err, 'Error al cargar las remesas'));
    this.service.pendientes().subscribe({
      next: (p) => {
        this.pendientes.set(p);
        this.marcadas.set(new Set(p.grupos.flatMap((g) => g.facturas.map((f) => f.facturaId))));
      },
      error: fallo,
    });
    this.service.regirables().subscribe({
      next: (p) => { this.regirables.set(p); this.marcadasRegiro.set(new Set()); },
      error: fallo,
    });
    this.service.list().subscribe({ next: (r) => this.remesas.set(r), error: fallo });
  }

  protected elegir(p: Pestana): void { this.tab.set(p); }

  // ── Selección ───────────────────────────────────────────────────────────

  protected marcadasDe(g: VibraRemesaGrupo): VibraRemesaCobrable[] {
    const m = this.marcadas();
    return g.facturas.filter((f) => m.has(f.facturaId));
  }

  protected importeMarcado(g: VibraRemesaGrupo): number {
    return this.marcadasDe(g).reduce((s, f) => s + f.importe, 0);
  }

  protected alternar(id: string, regiro = false): void {
    const sig = regiro ? this.marcadasRegiro : this.marcadas;
    sig.update((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  /** Marca o quita todas las facturas del grupo. */
  protected todas(facturas: VibraRemesaCobrable[], marcar: boolean, regiro = false): void {
    const sig = regiro ? this.marcadasRegiro : this.marcadas;
    sig.update((s) => {
      const n = new Set(s);
      for (const f of facturas) { if (marcar) n.add(f.facturaId); else n.delete(f.facturaId); }
      return n;
    });
  }

  protected todasMarcadas(facturas: VibraRemesaCobrable[], regiro = false): boolean {
    const m = regiro ? this.marcadasRegiro() : this.marcadas();
    return facturas.length > 0 && facturas.every((f) => m.has(f.facturaId));
  }

  protected algunaMarcada(facturas: VibraRemesaCobrable[], regiro = false): boolean {
    const m = regiro ? this.marcadasRegiro() : this.marcadas();
    return facturas.some((f) => m.has(f.facturaId)) && !this.todasMarcadas(facturas, regiro);
  }

  // ── Acciones ────────────────────────────────────────────────────────────

  protected generar(g: VibraRemesaGrupo): void {
    const ids = this.marcadasDe(g).map((f) => f.facturaId);
    if (!g.fechaCobro || ids.length === 0) return;
    this.enviar('EMITIDAS', g.fechaCobro, ids, 'g-' + g.fechaCobro);
  }

  protected generarRegiro(): void {
    const m = this.marcadasRegiro();
    const ids = this.facturasRegiro().filter((f) => m.has(f.facturaId)).map((f) => f.facturaId);
    if (ids.length === 0) return;
    if (!this.fechaRegiro || this.fechaRegiro < this.manana) {
      this.notify.error('La fecha de cobro tiene que ser posterior a hoy');
      return;
    }
    this.enviar('IMPAGADOS', this.fechaRegiro, ids, 'regiro');
  }

  private enviar(tipo: TipoRemesaVibra, fechaCobro: string, facturaIds: string[], clave: string): void {
    this.ocupado.set(clave);
    this.service.generar({ tipo, fechaCobro, facturaIds }).subscribe({
      next: (r) => {
        this.ocupado.set(null);
        this.notify.success(`Remesa nº ${r.numero} generada: descarga el XML y súbelo al banco`);
        this.router.navigate(['/vibra/remesas', r.id]);
      },
      error: (err: HttpErrorResponse) => {
        this.ocupado.set(null);
        this.notify.error(mensajeError(err, 'No se pudo generar la remesa'));
        this.load();
      },
    });
  }

  protected descargar(r: VibraRemesaListItem): void {
    descargarXml(this.service, this.notify, r);
  }

  protected anular(): void {
    const r = this.anulando();
    if (!r) return;
    this.ocupado.set('anular');
    this.service.anular(r.id).subscribe({
      next: () => {
        this.ocupado.set(null);
        this.anulando.set(null);
        this.notify.success(`Remesa nº ${r.numero} anulada: sus facturas vuelven a pendientes`);
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.ocupado.set(null);
        this.notify.error(mensajeError(err, 'No se pudo anular la remesa'));
      },
    });
  }
}
