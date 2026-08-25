import {
  ChangeDetectionStrategy, Component, computed, inject, signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { PageHeader }    from '../../../shared/components/page-header/page-header';
import { TableSkeleton } from '../../../shared/components/table-skeleton/table-skeleton';
import { StatusTone } from '../../../shared/components/status-badge/status-badge';
import { Pagination }    from '../../../shared/components/pagination/pagination';
import { KpiCard }       from '../../../shared/components/kpi-card/kpi-card';
import { Icon }          from '../../../shared/icons/icon';

import { GestionImpagoService } from '../../../core/services/gestion-impago.service';
import { NotificationService }  from '../../../core/services/notification.service';
import { GlobalLoadingService } from '../../../core/services/global-loading.service';
import {
  GestionImpago, GestionImpagoPayload,
  EstadoGestionImpago, GestionImpagoActualizarEstadoPayload,
  ESTADO_GESTION_IMPAGO_LABEL, Page,
} from '../../../core/models';

function extractMessage(err: HttpErrorResponse): string {
  return (err.error as { message?: string })?.message ?? err.message ?? 'Error inesperado';
}

const STEP_ACTIONS: Record<number, string[]> = {
  1: ['llamada', 'whatsapp'],
  2: ['llamada', 'whatsapp', 'email', 'otro'],
  3: ['llamada', 'whatsapp', 'email', 'aviso_corte', 'otro'],
  4: ['aviso_corte', 'llamada', 'promesa'],
  5: ['llamada', 'whatsapp', 'email', 'promesa'],
};

function estadoToneFn(estado: EstadoGestionImpago): StatusTone {
  switch (estado) {
    case 'aviso_corte': return 'warning';
    case 'cortado':     return 'danger';
    case 'pagado':      return 'success';
    default:            return 'neutral';
  }
}

@Component({
  selector: 'app-disconnection',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, TableSkeleton, Pagination, KpiCard, Icon, FormsModule, RouterLink],
  templateUrl: './disconnection.html',
})
export class Disconnection {
  private readonly service       = inject(GestionImpagoService);
  private readonly notify        = inject(NotificationService);
  private readonly globalLoading = inject(GlobalLoadingService);

  // ── Corte alerts (banner) ─────────────────────────────────────────────────
  protected readonly alerts         = signal<GestionImpago[]>([]);
  protected readonly alertsLoading  = signal(false);
  protected readonly alertsExpanded = signal(false);

  // ── List state ────────────────────────────────────────────────────────────
  protected readonly loading       = signal(false);
  protected readonly result        = signal<Page<GestionImpago> | null>(null);
  protected readonly error         = signal<string | null>(null);
  protected readonly page          = signal(0);
  protected readonly size          = signal(20);

  // ── Filters ───────────────────────────────────────────────────────────────
  protected q             = '';
  protected estadoFilter: 'aviso_corte' | 'cortado' | '' = '';
  protected sortOption    = 'nombreCliente,asc';

  // KPI counts from backend totals (not just current page)
  protected readonly totalAvisoCorte = signal(0);
  protected readonly totalCortado    = signal(0);

  // ── Constants ─────────────────────────────────────────────────────────────
  protected readonly estadoLabel = ESTADO_GESTION_IMPAGO_LABEL;

  protected readonly rows          = computed(() => this.result()?.content ?? []);
  protected readonly totalElements = computed(() => this.result()?.totalElements ?? 0);
  protected readonly totalPages    = computed(() => this.result()?.totalPages ?? 0);

  protected readonly countAvisoCorte = computed(() => this.totalAvisoCorte());
  protected readonly countCortado    = computed(() => this.totalCortado());

  // ── Update ────────────────────────────────────────────────────────────────
  protected updatingId = signal<string | null>(null);

  // ── Contacto form (inline expand) ─────────────────────────────────────────
  protected readonly expandedContactoId = signal<string | null>(null);
  protected contactoForms: Record<string, {
    actionKey: string; notes: string; promesaFecha: string; promesaImporte: string; targetStep: number;
  }> = {};

  // ── Motivo editing ────────────────────────────────────────────────────────
  protected readonly editingMotivoId = signal<string | null>(null);
  protected editingMotivoValue = '';

  constructor() {
    this.loadAlerts();
    this.reload(0);
  }

  // ── Corte alerts ──────────────────────────────────────────────────────────
  private loadAlerts(): void {
    this.alertsLoading.set(true);
    this.service.corteAlertas().subscribe({
      next:  (list) => { this.alerts.set(list); this.alertsLoading.set(false); },
      error: () => this.alertsLoading.set(false),
    });
  }

  protected skipAlert(r: GestionImpago): void {
    this.globalLoading.start('Procesando', '');
    this.service.actualizarEstado(r.id, { estado: r.estado, notas: 'Alerta de corte omitida' }).subscribe({
      next: () => {
        this.globalLoading.stop();
        this.alerts.update(list => list.filter(a => a.id !== r.id));
        this.notify.success('Alerta omitida');
      },
      error: (err: HttpErrorResponse) => { this.globalLoading.stop(); this.notify.error(extractMessage(err)); },
    });
  }

  protected ejecutarCorte(r: GestionImpago): void {
    this.updatingId.set(r.id);
    this.globalLoading.start('Procesando', 'Marcando como cortado…');
    this.service.actualizarEstado(r.id, { estado: 'cortado' }).subscribe({
      next: () => {
        this.updatingId.set(null);
        this.globalLoading.stop();
        this.alerts.update(list => list.filter(a => a.id !== r.id));
        this.notify.success('Corte ejecutado');
        this.reload(this.page());
      },
      error: (err: HttpErrorResponse) => {
        this.updatingId.set(null);
        this.globalLoading.stop();
        this.notify.error(extractMessage(err));
      },
    });
  }

  protected alertDays(dateStr: string | null | undefined): number {
    if (!dateStr) return 0;
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diff / 86_400_000);
  }

  // ── List ──────────────────────────────────────────────────────────────────
  protected reload(p: number): void {
    this.page.set(p);
    this.loading.set(true);
    this.service.corteList(
      { q: this.q || undefined, estado: this.estadoFilter || undefined },
      { page: p, size: this.size(), sort: this.sortOption },
    ).subscribe({
      next: (res) => {
        this.result.set(res);
        this.loading.set(false);
        this.loadKpiCounts();
      },
      error: (err: HttpErrorResponse) => { this.error.set(extractMessage(err)); this.loading.set(false); },
    });
  }

  private loadKpiCounts(): void {
    this.service.corteList({ estado: 'aviso_corte' }, { size: 1 }).subscribe({
      next: (res) => this.totalAvisoCorte.set(res.totalElements),
    });
    this.service.corteList({ estado: 'cortado' }, { size: 1 }).subscribe({
      next: (res) => this.totalCortado.set(res.totalElements),
    });
  }

  protected onSizeChange(size: number): void { this.size.set(size); this.reload(0); }
  protected applyFilters(): void { this.reload(0); }
  protected clearFilters(): void { this.q = ''; this.estadoFilter = ''; this.sortOption = 'nombreCliente,asc'; this.reload(0); }

  // ── Patch any fields ──────────────────────────────────────────────────────
  private buildPayload(r: GestionImpago, patch: Partial<GestionImpagoPayload> = {}): GestionImpagoPayload {
    return {
      clienteId: r.clienteId,
      numeroFactura: r.numeroFactura,
      importe: r.importe,
      parcialPagado: r.parcialPagado,
      moneda: r.moneda,
      fechaVencimiento: r.fechaVencimiento,
      fechaDevolucion: r.fechaDevolucion,
      estado: r.estado,
      prioridad: r.prioridad,
      colaborador: r.colaborador,
      motivoDevolucion: r.motivoDevolucion,
      asnef: r.asnef,
      burofaxAvisoCorte: r.burofaxAvisoCorte,
      ovcPredemanda: r.ovcPredemanda,
      demandaM1: r.demandaM1,
      nextActionDate: r.nextActionDate,
      skipCorteAlert: r.skipCorteAlert,
      observaciones: r.observaciones,
      hubspotDealId: r.hubspotDealId,
      ...patch,
    };
  }

  protected patchRecord(r: GestionImpago, patch: Partial<GestionImpagoPayload>): void {
    this.updatingId.set(r.id);
    this.service.update(r.id, this.buildPayload(r, patch)).subscribe({
      next:  () => { this.updatingId.set(null); this.reload(this.page()); },
      error: (err: HttpErrorResponse) => {
        this.updatingId.set(null);
        this.notify.error(extractMessage(err));
      },
    });
  }

  // ── Contacto form ─────────────────────────────────────────────────────────
  protected readonly contactoActions = [
    { key: 'llamada',     label: 'Llamada',     icon: 'phone'           as const },
    { key: 'email',       label: 'Email',       icon: 'mail'            as const },
    { key: 'whatsapp',    label: 'WhatsApp',    icon: 'message-square'  as const },
    { key: 'aviso_corte', label: 'Aviso corte', icon: 'scissors'        as const },
    { key: 'promesa',     label: 'Promesa',     icon: 'calendar-check'  as const },
    { key: 'otro',        label: 'Otro',        icon: 'more-horizontal' as const },
  ];

  protected stepContactoActions(rowId: string): typeof this.contactoActions {
    const step = this.contactoForms[rowId]?.targetStep ?? 1;
    const keys = STEP_ACTIONS[step] ?? ['llamada'];
    return this.contactoActions.filter(a => keys.includes(a.key));
  }

  protected setContactoAction(rowId: string, key: string): void {
    if (this.contactoForms[rowId]) {
      this.contactoForms[rowId].actionKey = key;
    }
  }

  protected toggleContactoForm(r: GestionImpago, step: number): void {
    if (this.expandedContactoId() === r.id && this.contactoForms[r.id]?.targetStep === step) {
      this.expandedContactoId.set(null);
    } else {
      const keys = STEP_ACTIONS[step] ?? ['llamada'];
      this.expandedContactoId.set(r.id);
      this.contactoForms[r.id] = { actionKey: keys[0], notes: '', promesaFecha: '', promesaImporte: '', targetStep: step };
    }
  }

  protected registrarContacto(r: GestionImpago): void {
    const form = this.contactoForms[r.id];
    if (!form?.actionKey) return;
    this.updatingId.set(r.id);
    this.service.registrarContacto(r.id, {
      actionKey:      form.actionKey,
      notes:          form.notes          || null,
      promesaFecha:   form.promesaFecha   || null,
      promesaImporte: form.promesaImporte ? parseFloat(form.promesaImporte) : null,
    }).subscribe({
      next: () => {
        this.updatingId.set(null);
        this.expandedContactoId.set(null);
        this.notify.success('Contacto registrado');
        this.reload(this.page());
      },
      error: (err: HttpErrorResponse) => {
        this.updatingId.set(null);
        this.notify.error(extractMessage(err));
      },
    });
  }

  // ── Motivo editing ────────────────────────────────────────────────────────
  protected startEditMotivo(r: GestionImpago): void {
    this.editingMotivoId.set(r.id);
    this.editingMotivoValue = r.motivoDevolucion ?? '';
  }

  protected saveMotivo(r: GestionImpago): void {
    if (this.editingMotivoId() !== r.id) return;
    const current = r.motivoDevolucion ?? '';
    this.editingMotivoId.set(null);
    if (this.editingMotivoValue !== current) {
      this.patchRecord(r, { motivoDevolucion: this.editingMotivoValue || null });
    }
  }

  protected cancelEditMotivo(): void { this.editingMotivoId.set(null); }

  // ── Estado update ─────────────────────────────────────────────────────────
  protected actualizarEstado(r: GestionImpago, estado: EstadoGestionImpago): void {
    this.updatingId.set(r.id);
    const payload: GestionImpagoActualizarEstadoPayload = { estado };
    this.globalLoading.start('Actualizando', '');
    this.service.actualizarEstado(r.id, payload).subscribe({
      next: () => {
        this.updatingId.set(null);
        this.globalLoading.stop();
        this.notify.success('Estado actualizado');
        this.reload(this.page());
      },
      error: (err: HttpErrorResponse) => {
        this.updatingId.set(null);
        this.globalLoading.stop();
        this.notify.error(extractMessage(err));
      },
    });
  }

  // ── Display helpers ───────────────────────────────────────────────────────
  protected estadoTone(estado: EstadoGestionImpago): StatusTone { return estadoToneFn(estado); }
  protected formatEur(v: number): string {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v);
  }
  protected fmt(v: string | null): string {
    return v ? new Date(v).toLocaleDateString('es-ES') : '—';
  }
  protected fmtShort(v: string | null): string {
    if (!v) return '—';
    const d = new Date(v);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}`;
  }
  protected contactoLabel(step: number): string {
    const ordinals = ['', '1er', '2do', '3er', '4to', '5to'];
    return step > 0 ? `${ordinals[step] ?? step + 'º'} Contacto` : '';
  }
}
