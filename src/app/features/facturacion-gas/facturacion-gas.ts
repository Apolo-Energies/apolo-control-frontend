import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { GasFacturacionService } from '../../core/services/gas-facturacion.service';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { Icon } from '../../shared/icons/icon';
import { GasConfig, GasDato, GasEmailLog, GasFactura, GasMovimiento, GasRemittance, PageResponse } from '../../core/models/gas-facturacion.model';
import { IconName } from '../../shared/icons/icon';

type Tab = 'facturas' | 'movimientos' | 'resumen' | 'config' | 'historial' | 'remesas';

function extractMsg(err: HttpErrorResponse): string {
  return (err.error as { message?: string })?.message ?? err.message ?? 'Error inesperado';
}

@Component({
  selector: 'app-facturacion-gas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, PageHeader, Icon],
  templateUrl: './facturacion-gas.html',
})
export class FacturacionGas implements OnInit {
  private readonly svc    = inject(GasFacturacionService);
  private readonly notify = inject(NotificationService);

  protected readonly activeTab = signal<Tab>('facturas');

  protected readonly tabs: Array<{ id: Tab; label: string; icon: IconName }> = [
    { id: 'facturas',    label: 'Facturas',       icon: 'file-text' },
    { id: 'movimientos', label: 'Movimientos',    icon: 'arrow-left-right' },
    { id: 'remesas',     label: 'Remesas Banco',  icon: 'wallet' },
    { id: 'resumen',     label: 'Exportar A3',    icon: 'list-todo' },
    { id: 'config',      label: 'Config. Envíos', icon: 'sliders' },
    { id: 'historial',   label: 'Historial',      icon: 'clock' },
  ];

  // ── Facturas ─────────────────────────────────────────────────────────────
  protected readonly loadingFacturas = signal(false);
  protected readonly facturas        = signal<GasFactura[]>([]);
  protected readonly facturasError   = signal<string | null>(null);
  protected facturasDesde = this.defaultDesde();
  protected facturasHasta = this.defaultHasta();

  // ── Movimientos ──────────────────────────────────────────────────────────
  protected readonly loadingMovimientos = signal(false);
  protected readonly movimientos        = signal<GasMovimiento[]>([]);
  protected readonly movimientosError   = signal<string | null>(null);
  protected movimientosDesde = this.defaultDesde();
  protected movimientosHasta = this.defaultHasta();

  // ── Resumen ──────────────────────────────────────────────────────────────
  protected readonly loadingDatos  = signal(false);
  protected readonly datos         = signal<GasDato[]>([]);
  protected readonly datosError    = signal<string | null>(null);

  protected readonly selectedYear  = signal(new Date().getFullYear());
  protected readonly selectedMonth = signal(new Date().getMonth() + 1);

  protected readonly years = computed(() => {
    const cur = new Date().getFullYear();
    return [cur - 1, cur, cur + 1];
  });

  protected readonly months = [
    { v: 1, l: 'Enero' }, { v: 2, l: 'Febrero' }, { v: 3, l: 'Marzo' },
    { v: 4, l: 'Abril' }, { v: 5, l: 'Mayo' }, { v: 6, l: 'Junio' },
    { v: 7, l: 'Julio' }, { v: 8, l: 'Agosto' }, { v: 9, l: 'Septiembre' },
    { v: 10, l: 'Octubre' }, { v: 11, l: 'Noviembre' }, { v: 12, l: 'Diciembre' },
  ];

  // ── Config ───────────────────────────────────────────────────────────────
  protected readonly loadingConfig  = signal(false);
  protected readonly config         = signal<GasConfig | null>(null);
  protected readonly savingConfig   = signal(false);
  protected editRecipients     = '';
  protected editCcRecipients   = '';
  protected editScheduled      = true;
  protected editScheduledDay   = 'MON';
  protected editScheduledHour  = 7;
  protected editQuerySql       = '';

  protected readonly scheduledDays = [
    { v: 'MON', l: 'Lunes' }, { v: 'TUE', l: 'Martes' }, { v: 'WED', l: 'Miércoles' },
    { v: 'THU', l: 'Jueves' }, { v: 'FRI', l: 'Viernes' },
    { v: 'SAT', l: 'Sábado' }, { v: 'SUN', l: 'Domingo' },
  ];
  protected readonly scheduledHours = Array.from({ length: 24 }, (_, i) => i);

  // ── Remesas ──────────────────────────────────────────────────────────────
  protected readonly loadingRemesas  = signal(false);
  protected readonly remesas         = signal<GasRemittance[]>([]);
  protected readonly remesasError    = signal<string | null>(null);
  protected readonly downloadingId   = signal<string | null>(null);
  private remesasLoaded = false;

  // ── Historial ────────────────────────────────────────────────────────────
  protected readonly loadingHistorial = signal(false);
  protected readonly historial        = signal<PageResponse<GasEmailLog> | null>(null);
  protected readonly histPage         = signal(0);

  // ── Envío manual ─────────────────────────────────────────────────────────
  protected readonly sending      = signal(false);
  protected envioDesde = '';
  protected envioHasta = '';

  ngOnInit(): void {
    this.loadFacturas();
    this.loadMovimientos();
    this.loadConfig();
    this.loadHistorial();
  }

  // ── Tabs ─────────────────────────────────────────────────────────────────

  protected setTab(t: string): void {
    this.activeTab.set(t as Tab);
    if (t === 'remesas' && !this.remesasLoaded) this.loadRemesas();
  }

  // ── Facturas ──────────────────────────────────────────────────────────────

  protected loadFacturas(): void {
    if (!this.facturasDesde || !this.facturasHasta) return;
    this.loadingFacturas.set(true);
    this.facturasError.set(null);
    this.svc.getFacturas(this.facturasDesde, this.facturasHasta).subscribe({
      next: (d) => { this.facturas.set(d); this.loadingFacturas.set(false); },
      error: (e: HttpErrorResponse) => { this.facturasError.set(extractMsg(e)); this.loadingFacturas.set(false); },
    });
  }

  protected facturasTipo(f: GasFactura): string {
    return f.business_invoice_type === 'b70_R' ? 'Rectificativa' : 'Normal';
  }

  protected facturasEstado(f: GasFactura): string {
    const m: Record<string, string> = { issued: 'Emitida', cancelled: 'Cancelada', draft: 'Borrador' };
    return m[f.invoice_status] ?? f.invoice_status;
  }

  protected facturasValidacion(f: GasFactura): string {
    const m: Record<string, string> = { correct: 'Correcto', error: 'Error' };
    return f.validation_status ? (m[f.validation_status] ?? f.validation_status) : '—';
  }

  protected get facturasTotal(): number {
    return this.facturas().reduce((s, f) => s + (f.total_amount ?? 0), 0);
  }
  protected get facturasPendiente(): number {
    return this.facturas().reduce((s, f) => s + (f.pending_amount ?? 0), 0);
  }
  protected get facturasBaseTotal(): number {
    return this.facturas().reduce((s, f) => s + (f.taxable_base_amount ?? 0), 0);
  }
  protected get facturasIvaTotal(): number {
    return this.facturas().reduce((s, f) => s + (f.tax_amount ?? 0), 0);
  }
  protected get facturasPagadoTotal(): number {
    return this.facturas().reduce((s, f) => s + (f.paid_amount ?? 0), 0);
  }
  protected get facturasEmitidasCount(): number {
    return this.facturas().filter(f => f.invoice_status === 'issued').length;
  }

  // ── Movimientos ───────────────────────────────────────────────────────────

  protected loadMovimientos(): void {
    if (!this.movimientosDesde || !this.movimientosHasta) return;
    this.loadingMovimientos.set(true);
    this.movimientosError.set(null);
    this.svc.getMovimientos(this.movimientosDesde, this.movimientosHasta).subscribe({
      next: (d) => { this.movimientos.set(d); this.loadingMovimientos.set(false); },
      error: (e: HttpErrorResponse) => { this.movimientosError.set(extractMsg(e)); this.loadingMovimientos.set(false); },
    });
  }

  protected movTipo(m: GasMovimiento): string {
    return m.movement_type === 'debit' ? 'Debe' : 'Haber';
  }

  protected movOrigen(m: GasMovimiento): string {
    const map: Record<string, string> = {
      invoicing:          'Facturación',
      payment_allocation: 'Pago',
      manual:             'Manual',
    };
    return map[m.movement_source_type] ?? m.movement_source_type;
  }

  protected get movimientosDebeTotal(): number {
    return this.movimientos().filter(m => m.movement_type === 'debit').reduce((s, m) => s + m.amount, 0);
  }
  protected get movimientosHaberTotal(): number {
    return this.movimientos().filter(m => m.movement_type === 'credit').reduce((s, m) => s + m.amount, 0);
  }

  // ── Datos ─────────────────────────────────────────────────────────────────

  protected loadDatos(): void {
    this.loadingDatos.set(true);
    this.datosError.set(null);
    this.svc.getDatosMes(this.selectedYear(), this.selectedMonth()).subscribe({
      next: (d) => { this.datos.set(d); this.loadingDatos.set(false); },
      error: (e: HttpErrorResponse) => { this.datosError.set(extractMsg(e)); this.loadingDatos.set(false); },
    });
  }

  protected onMesChange(): void { this.loadDatos(); }

  protected get datosColumns(): string[] {
    const d = this.datos();
    if (!d.length) return [];
    return Object.keys(d[0]).filter(k => k !== '__typename');
  }

  protected cellValue(row: GasDato, col: string): string {
    const v = row[col];
    if (v == null) return '—';
    if (typeof v === 'number') return v.toLocaleString('es-ES');
    return String(v);
  }

  protected get totalImporte(): number {
    return this.datos().reduce((sum, r) => sum + (r.LINPRCMONEDA ?? 0), 0);
  }

  // ── Config ────────────────────────────────────────────────────────────────

  protected loadConfig(): void {
    this.loadingConfig.set(true);
    this.svc.getConfig().subscribe({
      next: (c) => {
        this.config.set(c);
        this.editRecipients    = c.recipients ?? '';
        this.editCcRecipients  = c.ccRecipients ?? '';
        this.editScheduled     = c.scheduledEnabled;
        this.editScheduledDay  = c.scheduledDay  ?? 'MON';
        this.editScheduledHour = c.scheduledHour ?? 7;
        this.editQuerySql      = c.querySql ?? '';
        this.loadingConfig.set(false);
      },
      error: () => this.loadingConfig.set(false),
    });
  }

  protected saveConfig(): void {
    this.savingConfig.set(true);
    this.svc.updateConfig({
      recipients:       this.editRecipients,
      ccRecipients:     this.editCcRecipients,
      scheduledEnabled: this.editScheduled,
      scheduledDay:     this.editScheduledDay,
      scheduledHour:    this.editScheduledHour,
      querySql:         this.editQuerySql || null,
    }).subscribe({
      next: (c) => {
        this.config.set(c);
        this.savingConfig.set(false);
        this.notify.success('Configuración guardada');
      },
      error: (e: HttpErrorResponse) => {
        this.savingConfig.set(false);
        this.notify.error(extractMsg(e));
      },
    });
  }

  // ── Remesas ───────────────────────────────────────────────────────────────

  protected loadRemesas(): void {
    this.remesasLoaded = true;
    this.loadingRemesas.set(true);
    this.remesasError.set(null);
    this.svc.getRemesas().subscribe({
      next: (d) => { this.remesas.set(d); this.loadingRemesas.set(false); },
      error: (e: HttpErrorResponse) => { this.remesasError.set(extractMsg(e)); this.loadingRemesas.set(false); },
    });
  }

  protected onDownloadXml(id: string): void {
    this.downloadingId.set(id);
    this.svc.getRemesaXml(id).subscribe({
      next: (data) => {
        this.downloadingId.set(null);
        if (!data.url) { this.notify.error('No se encontró el XML de esta remesa'); return; }
        const a = document.createElement('a');
        a.href = data.url;
        a.download = data.fileName ?? 'remesa.xml';
        a.target = '_blank';
        a.click();
      },
      error: (e: HttpErrorResponse) => {
        this.downloadingId.set(null);
        this.notify.error(extractMsg(e));
      },
    });
  }

  protected get remesasTotalImporte(): number {
    return this.remesas().reduce((s, r) => s + (r.total_amount ?? 0), 0);
  }

  // ── Historial ─────────────────────────────────────────────────────────────

  protected loadHistorial(): void {
    this.loadingHistorial.set(true);
    this.svc.getHistorial(this.histPage(), 25).subscribe({
      next: (p) => { this.historial.set(p); this.loadingHistorial.set(false); },
      error: () => this.loadingHistorial.set(false),
    });
  }

  protected histPrev(): void { this.histPage.update(p => Math.max(0, p - 1)); this.loadHistorial(); }
  protected histNext(): void { this.histPage.update(p => p + 1); this.loadHistorial(); }

  protected get histHasPrev(): boolean { return this.histPage() > 0; }
  protected get histHasNext(): boolean {
    const p = this.historial();
    return p != null && this.histPage() < p.totalPages - 1;
  }

  // ── Envío manual ─────────────────────────────────────────────────────────

  protected enviarAhora(): void {
    const desde = this.envioDesde;
    const hasta = this.envioHasta;
    if (!desde || !hasta) {
      this.notify.error('Selecciona el rango de fechas');
      return;
    }
    this.sending.set(true);
    this.svc.enviar(desde, hasta).subscribe({
      next: (log) => {
        this.sending.set(false);
        if (log.status === 'ok') {
          this.notify.success(`Envío realizado: ${log.rowCount} filas`);
        } else {
          this.notify.error(`Error en el envío: ${log.errorMessage ?? 'desconocido'}`);
        }
        this.loadHistorial();
      },
      error: (e: HttpErrorResponse) => {
        this.sending.set(false);
        this.notify.error(extractMsg(e));
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private defaultDesde(): string {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  }

  private defaultHasta(): string {
    return new Date().toISOString().slice(0, 10);
  }

  protected fmt(n: number | null | undefined): string {
    if (n == null) return '—';
    return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ── Formatting ────────────────────────────────────────────────────────────

  protected formatDate(d: string | null): string {
    if (!d) return '—';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString('es-ES');
  }

  protected formatDateTime(d: string | null): string {
    if (!d) return '—';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleString('es-ES');
  }
}
