import {
  ChangeDetectionStrategy, Component, computed, inject, signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { Icon }       from '../../../shared/icons/icon';
import { StatusBadge, StatusTone } from '../../../shared/components/status-badge/status-badge';

import { GestionImpagoService } from '../../../core/services/gestion-impago.service';
import { NotificationService }  from '../../../core/services/notification.service';
import {
  GestionImpago, EstadoGestionImpago, ESTADO_GESTION_IMPAGO_LABEL,
} from '../../../core/models';

const EXCLUDED: EstadoGestionImpago[] = ['pagado', 'ovc', 'predemanda', 'demanda', 'juicio', 'va_a_pagar'];

function isNew(r: GestionImpago): boolean {
  if (!r.fechaDevolucion) return false;
  return (Date.now() - new Date(r.fechaDevolucion).getTime()) / 86400000 <= 3;
}

function isGestionadoHoy(r: GestionImpago): boolean {
  if (!r.contactoHistory.length) return false;
  const last = new Date(r.contactoHistory[r.contactoHistory.length - 1].date);
  const now  = new Date();
  return last.getFullYear() === now.getFullYear() &&
         last.getMonth()    === now.getMonth()    &&
         last.getDate()     === now.getDate();
}

function sortPriority(r: GestionImpago): number {
  if (isNew(r)) return 0;
  return (r.contactoStep ?? 0) + 1;
}

function extractMessage(err: HttpErrorResponse): string {
  return (err.error as { message?: string })?.message ?? err.message ?? 'Error inesperado';
}

interface ContactoForm {
  actionKey: string;
  notes: string;
  promesaFecha: string;
  promesaImporte: string;
}

@Component({
  selector: 'app-tasks',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, Icon, StatusBadge, FormsModule, RouterLink],
  templateUrl: './tasks.html',
})
export class Tasks {
  private readonly service = inject(GestionImpagoService);
  private readonly notify  = inject(NotificationService);

  protected readonly loading       = signal(false);
  protected readonly rows          = signal<GestionImpago[]>([]);
  protected readonly error         = signal<string | null>(null);
  protected readonly updatingId    = signal<string | null>(null);
  protected readonly expandedId    = signal<string | null>(null);
  protected readonly q             = signal('');
  protected readonly contactoFilter = signal<'all' | '0' | '1' | '2' | '3+'>('all');
  protected readonly fechaDesde    = signal('');
  protected readonly fechaHasta    = signal('');
  protected readonly sortBy        = signal<'priority' | 'deuda_desc' | 'fecha_desc' | 'fecha_asc'>('priority');

  protected contactoForms: Record<string, ContactoForm> = {};

  protected readonly estadoLabel = ESTADO_GESTION_IMPAGO_LABEL;

  protected readonly lista = computed(() => {
    const q          = this.q().toLowerCase().trim();
    const cFilter    = this.contactoFilter();
    const desde      = this.fechaDesde() ? new Date(this.fechaDesde()).getTime() : null;
    const hasta      = this.fechaHasta() ? new Date(this.fechaHasta() + 'T23:59:59').getTime() : null;
    const sort       = this.sortBy();

    const filtered = this.rows()
      .filter(r => !EXCLUDED.includes(r.estado))
      .filter(r => !isGestionadoHoy(r))
      .filter(r => !q ||
        (r.clienteNombre ?? '').toLowerCase().includes(q) ||
        (r.numeroFactura ?? '').toLowerCase().includes(q),
      )
      .filter(r => {
        if (cFilter === 'all') return true;
        const step = r.contactoStep;
        if (cFilter === '0') return step === 0;
        if (cFilter === '1') return step === 1;
        if (cFilter === '2') return step === 2;
        return step >= 3;
      })
      .filter(r => {
        if (!desde && !hasta) return true;
        const t = r.fechaDevolucion ? new Date(r.fechaDevolucion).getTime() : null;
        if (!t) return false;
        if (desde && t < desde) return false;
        if (hasta && t > hasta) return false;
        return true;
      });

    return filtered.sort((a, b) => {
      switch (sort) {
        case 'deuda_desc':
          return (b.importePendiente ?? 0) - (a.importePendiente ?? 0);
        case 'fecha_desc':
          return (b.fechaDevolucion ? new Date(b.fechaDevolucion).getTime() : 0) -
                 (a.fechaDevolucion ? new Date(a.fechaDevolucion).getTime() : 0);
        case 'fecha_asc':
          return (a.fechaDevolucion ? new Date(a.fechaDevolucion).getTime() : 0) -
                 (b.fechaDevolucion ? new Date(b.fechaDevolucion).getTime() : 0);
        default: {
          const pA = sortPriority(a), pB = sortPriority(b);
          if (pA !== pB) return pA - pB;
          const tA = a.contactoHistory.length
            ? new Date(a.contactoHistory[a.contactoHistory.length - 1].date).getTime() : 0;
          const tB = b.contactoHistory.length
            ? new Date(b.contactoHistory[b.contactoHistory.length - 1].date).getTime() : 0;
          return tA - tB;
        }
      }
    });
  });

  protected readonly nuevosCount    = computed(() => this.lista().filter(r => isNew(r)).length);
  protected readonly gestionadosHoy = computed(() =>
    this.rows()
      .filter(r => !EXCLUDED.includes(r.estado))
      .filter(r => isGestionadoHoy(r)).length,
  );

  constructor() { this.load(); }

  protected load(): void {
    this.loading.set(true);
    this.service.tareas().subscribe({
      next:  (list) => { this.rows.set(list); this.loading.set(false); },
      error: (err: HttpErrorResponse) => { this.error.set(extractMessage(err)); this.loading.set(false); },
    });
  }

  protected isNew(r: GestionImpago): boolean { return isNew(r); }

  protected toggleExpand(r: GestionImpago): void {
    if (this.expandedId() === r.id) {
      this.expandedId.set(null);
    } else {
      this.expandedId.set(r.id);
      if (!this.contactoForms[r.id]) {
        this.contactoForms[r.id] = { actionKey: 'llamada', notes: '', promesaFecha: '', promesaImporte: '' };
      }
    }
  }

  protected actualizarEstado(r: GestionImpago, estado: EstadoGestionImpago): void {
    this.updatingId.set(r.id);
    this.service.actualizarEstado(r.id, { estado }).subscribe({
      next: (updated) => {
        this.updatingId.set(null);
        this.rows.update(list => list.map(item => item.id === updated.id ? updated : item));
      },
      error: (err: HttpErrorResponse) => {
        this.updatingId.set(null);
        this.notify.error(extractMessage(err));
      },
    });
  }

  protected registrarContacto(r: GestionImpago): void {
    const form = this.contactoForms[r.id];
    if (!form?.actionKey) return;
    this.updatingId.set(r.id);
    this.service.registrarContacto(r.id, {
      actionKey:      form.actionKey,
      notes:          form.notes         || null,
      promesaFecha:   form.promesaFecha  || null,
      promesaImporte: form.promesaImporte ? parseFloat(form.promesaImporte) : null,
    }).subscribe({
      next: (updated) => {
        this.updatingId.set(null);
        this.expandedId.set(null);
        this.notify.success('Contacto registrado');
        this.rows.update(list => list.map(item => item.id === updated.id ? updated : item));
      },
      error: (err: HttpErrorResponse) => {
        this.updatingId.set(null);
        this.notify.error(extractMessage(err));
      },
    });
  }

  protected fmtDateTime(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES') + ' · ' +
           d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  protected relativeDays(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (days === 0) return 'hoy';
    if (days === 1) return 'ayer';
    return `hace ${days} días`;
  }

  protected formatEur(v: number): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency', currency: 'EUR', minimumFractionDigits: 0,
    }).format(v);
  }

  protected fmt(v: string | null): string {
    return v ? new Date(v).toLocaleDateString('es-ES') : '—';
  }

  protected estadoTone(estado: EstadoGestionImpago): StatusTone {
    switch (estado) {
      case 'pagado':             return 'success';
      case 'va_a_pagar':         return 'info';
      case 'acuerdo_pago':       return 'info';
      case 'aviso_corte':        return 'warning';
      case 'cortado':            return 'danger';
      case 'ovc':                return 'purple';
      case 'predemanda':         return 'warning';
      case 'demanda':            return 'danger';
      case 'remesar_nuevamente': return 'neutral';
      default:                   return 'neutral';
    }
  }
}
