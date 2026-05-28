import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { KpiCard } from '../../../shared/components/kpi-card/kpi-card';
import { StatusBadge, StatusTone } from '../../../shared/components/status-badge/status-badge';
import { FilterBar } from '../../../shared/components/filter-bar/filter-bar';
import { ContactDots } from '../../../shared/components/contact-dots/contact-dots';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { Icon } from '../../../shared/icons/icon';

interface UnpaidInvoice {
  returnDate: string;
  cliente: string;
  invoice: string;
  amount: number;
  dueDate: string | null;
  overdueDays: number | null;
  status: UnpaidStatus;
  partner: string;
  returnReason: string | null;
  contacts: number;
  lastStatus: string;
  promiseDate: string | null;
}

type UnpaidStatus =
  | 'Nuevo'
  | 'Pagado'
  | 'Acuerdo Verbal'
  | 'Acuerdo Pago'
  | 'Aviso de corte'
  | 'Cortado'
  | 'OVC'
  | 'Demanda'
  | 'Otros';

interface PendingDisconnection {
  cliente: string;
  invoices: number;
  total: number;
  profile: string;
  contact: string;
  target: string;
}

@Component({
  selector: 'app-unpaid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, KpiCard, StatusBadge, FilterBar, ContactDots, EmptyState, Icon, DecimalPipe],
  templateUrl: './unpaid.html',
})
export class Unpaid {
  protected readonly search = signal('');
  protected readonly status = signal<string>('');
  protected readonly onlyOverdue = signal<boolean>(false);

  protected readonly statuses: UnpaidStatus[] = [
    'Nuevo',
    'Pagado',
    'Acuerdo Verbal',
    'Acuerdo Pago',
    'Aviso de corte',
    'Cortado',
    'OVC',
    'Demanda',
    'Otros',
  ];

  protected readonly pendingDisconnections: PendingDisconnection[] = [
    { cliente: 'DANIEL NICOLAS SKOT ALVAREZ',     invoices: 2, total: 185.66, profile: 'Persona física', contact: '5º contacto', target: '2 facturas pendientes' },
    { cliente: 'CAN BROCH DENIA SL',              invoices: 1, total: 355.01, profile: 'Sociedad',       contact: '5º contacto', target: 'Corte de suministro' },
    { cliente: 'VICENTE JOSE MARQUES LLOBELL',    invoices: 2, total: 216.76, profile: 'Persona física', contact: '5º contacto', target: '2 facturas pendientes' },
    { cliente: 'FRANCISCO JAVIER CORONADO BAENA', invoices: 2, total: 491.97, profile: 'Persona física', contact: '5º contacto', target: '2 facturas pendientes' },
  ];

  protected readonly rows: UnpaidInvoice[] = [
    { returnDate: '17/04/2026', cliente: 'ADRIAN ALFARO RUEDA',           invoice: '260003993', amount: 200.19, dueDate: '16/04/2026', overdueDays: null, status: 'Pagado',         partner: 'ASESORES MEDIATEL', returnReason: 'Saldo insuficiente', contacts: 1, lastStatus: '1er Contacto', promiseDate: null },
    { returnDate: '08/05/2026', cliente: 'AITOR DYLAN GAONA AVRAM',        invoice: '260004989', amount: 113.39, dueDate: '08/05/2026', overdueDays: null, status: 'Nuevo',          partner: 'CENTRAL',           returnReason: 'Mandato no válido', contacts: 0, lastStatus: '—', promiseDate: null },
    { returnDate: '31/03/2026', cliente: 'AITOR DYLAN GAONA AVRAM',        invoice: '260003431', amount: 85.90,  dueDate: '15/04/2026', overdueDays: null, status: 'Pagado',         partner: 'GESERVAL',          returnReason: 'Saldo insuficiente', contacts: 5, lastStatus: '5to Contacto', promiseDate: null },
    { returnDate: '17/04/2026', cliente: 'AITZIBER ZABALA MARADIAGA',      invoice: '260004102', amount: 451.00, dueDate: '08/05/2026', overdueDays: null, status: 'Otros',          partner: 'ALBIN GÓMEZ INV.',  returnReason: 'Saldo insuficiente', contacts: 5, lastStatus: '5to Contacto', promiseDate: '11/05' },
    { returnDate: '28/04/2026', cliente: 'AL ROCIO EXPLOTACIONES',         invoice: '260004248', amount: 305.14, dueDate: '28/04/2026', overdueDays: null, status: 'Pagado',         partner: 'CENTRAL',           returnReason: 'Saldo insuficiente', contacts: 2, lastStatus: '2do Contacto', promiseDate: null },
    { returnDate: '06/03/2026', cliente: 'CLOCHINAS NAVARRO SL',           invoice: '260001195', amount: 142.02, dueDate: '06/03/2026', overdueDays: 63,   status: 'Acuerdo Verbal', partner: 'BEENERGY',          returnReason: null, contacts: 3, lastStatus: '3er Contacto', promiseDate: '13/05' },
    { returnDate: '06/03/2026', cliente: 'CLOCHINAS NAVARRO SL',           invoice: '260001468', amount: 610.48, dueDate: '06/03/2026', overdueDays: 63,   status: 'Acuerdo Verbal', partner: 'BEENERGY',          returnReason: null, contacts: 3, lastStatus: '3er Contacto', promiseDate: '13/05' },
    { returnDate: '13/04/2026', cliente: 'DIEGO LANDI OVEJAS',             invoice: '260003733', amount: 10.94,  dueDate: '13/04/2026', overdueDays: 25,   status: 'Cortado',        partner: 'SEVERAL ENERGY',    returnReason: 'Mandato no válido', contacts: 5, lastStatus: '5to Contacto', promiseDate: null },
    { returnDate: '07/04/2026', cliente: 'DIEGO LANDI OVEJAS',             invoice: '260003627', amount: 63.28,  dueDate: '03/04/2026', overdueDays: 35,   status: 'Cortado',        partner: 'SEVERAL ENERGY',    returnReason: 'Mandato no válido', contacts: 5, lastStatus: '5to Contacto', promiseDate: null },
    { returnDate: '24/04/2026', cliente: 'ESTEFANY FLORES TERAN',          invoice: '260004493', amount: 418.15, dueDate: '24/04/2026', overdueDays: 14,   status: 'Aviso de corte', partner: 'SEVERAL ENERGY',    returnReason: 'Saldo insuficiente', contacts: 5, lastStatus: '5to Contacto', promiseDate: null },
    { returnDate: '20/02/2026', cliente: 'ESTEFANY FLORES TERAN',          invoice: '260002094', amount: 427.38, dueDate: '20/02/2026', overdueDays: 77,   status: 'Cortado',        partner: 'SEVERAL ENERGY',    returnReason: 'Saldo insuficiente', contacts: 5, lastStatus: '5to Contacto', promiseDate: '17/04' },
    { returnDate: '05/06/2025', cliente: 'AMAZING SPORTS S.L',             invoice: '250002661', amount: 90.93,  dueDate: '05/06/2025', overdueDays: 337,  status: 'OVC',            partner: 'SG ENERGY',         returnReason: null, contacts: 5, lastStatus: 'OVC', promiseDate: null },
    { returnDate: '12/07/2025', cliente: 'AMAZING SPORTS S.L',             invoice: '250003067', amount: 387.33, dueDate: '12/07/2025', overdueDays: 300,  status: 'OVC',            partner: 'SG ENERGY',         returnReason: null, contacts: 5, lastStatus: 'OVC', promiseDate: null },
    { returnDate: '19/12/2025', cliente: 'Amjad Wasim',                    invoice: '250008358', amount: 674.24, dueDate: '19/12/2025', overdueDays: 140,  status: 'OVC',            partner: 'CENTRAL',           returnReason: null, contacts: 5, lastStatus: 'OVC', promiseDate: null },
    { returnDate: '15/05/2025', cliente: 'ANGEL MENSA GONZALEZ',           invoice: '250002219', amount: 687.26, dueDate: '15/05/2025', overdueDays: 358,  status: 'OVC',            partner: 'JAVIER RUIZ',       returnReason: null, contacts: 5, lastStatus: 'OVC', promiseDate: null },
  ];

  protected readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const s = this.status();
    const overdue = this.onlyOverdue();

    return this.rows.filter((r) => {
      if (s && r.status !== s) return false;
      if (overdue && (!r.overdueDays || r.overdueDays <= 0)) return false;
      if (!q) return true;
      return r.cliente.toLowerCase().includes(q) || r.invoice.includes(q);
    });
  });

  protected onStatus(event: Event): void {
    this.status.set((event.target as HTMLSelectElement).value);
  }

  protected onOverdueChange(event: Event): void {
    this.onlyOverdue.set((event.target as HTMLSelectElement).value === '1');
  }

  protected clearFilters(): void {
    this.search.set('');
    this.status.set('');
    this.onlyOverdue.set(false);
  }

  protected toneFor(status: UnpaidStatus): StatusTone {
    switch (status) {
      case 'Pagado':         return 'success';
      case 'Acuerdo Verbal':
      case 'Acuerdo Pago':   return 'info';
      case 'Aviso de corte': return 'warning';
      case 'Cortado':
      case 'Demanda':        return 'danger';
      case 'OVC':            return 'purple';
      case 'Nuevo':          return 'info';
      default:               return 'neutral';
    }
  }

  protected formatEur(value: number): string {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
  }
}
