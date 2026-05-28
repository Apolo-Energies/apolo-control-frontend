import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { KpiCard } from '../../../shared/components/kpi-card/kpi-card';
import { StatusBadge, StatusTone } from '../../../shared/components/status-badge/status-badge';
import { FilterBar } from '../../../shared/components/filter-bar/filter-bar';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { Icon } from '../../../shared/icons/icon';

interface Registration {
  fecha: string;
  cups: string;
  partner: string;
  cliente: string;
  status: RegistrationStatus;
  validationDate: string | null;
  activationDate: string | null;
  koDate: string | null;
  koReason: string | null;
  consumption: number;
  scoring: number;
  notes: string | null;
}

type RegistrationStatus =
  | 'Válido'
  | 'Activo'
  | 'Enviado'
  | 'Pdte. firma'
  | 'Rechazado'
  | 'KO'
  | 'Baja';

@Component({
  selector: 'app-registrations',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, KpiCard, StatusBadge, FilterBar, EmptyState, Icon, DecimalPipe],
  templateUrl: './registrations.html',
})
export class Registrations {
  protected readonly search = signal('');
  protected readonly status = signal<string>('');
  protected readonly partner = signal<string>('');

  protected readonly statuses: RegistrationStatus[] = [
    'Válido',
    'Activo',
    'Enviado',
    'Pdte. firma',
    'Rechazado',
    'KO',
    'Baja',
  ];

  protected readonly partners = [
    'ENERGY POINT',
    'GESERVAL',
    'BEENERGY',
    'CENTRAL',
    'UEP GREEN COMMODITIES SL',
    'VANTY',
    'SEVERAL ENERGY',
  ];

  protected readonly rows: Registration[] = [
    { fecha: '06/05/2026', cups: 'ES0031601182940001KM0F', partner: 'ENERGY POINT', cliente: 'ZACASA', status: 'Válido', validationDate: '06/05/2026', activationDate: null, koDate: null, koReason: null, consumption: 20940, scoring: 0, notes: null },
    { fecha: '06/05/2026', cups: 'ES0021000012475237VB', partner: 'GESERVAL', cliente: 'LOURDES YOMIROED BUSTAMANTE FLORES', status: 'Válido', validationDate: '07/05/2026', activationDate: null, koDate: null, koReason: null, consumption: 6510, scoring: 0, notes: null },
    { fecha: '06/05/2026', cups: 'ES0021000006343280AS', partner: 'BEENERGY', cliente: 'SILVIA MARTINEZ ROCA', status: 'Válido', validationDate: '06/05/2026', activationDate: null, koDate: null, koReason: null, consumption: 5230, scoring: 0, notes: null },
    { fecha: '05/05/2026', cups: 'ES0031405163390001DH0F', partner: 'BEENERGY', cliente: 'MENJARS EUROPEUS SL', status: 'Enviado', validationDate: null, activationDate: null, koDate: null, koReason: null, consumption: 490, scoring: 0, notes: 'FECHA ACT: 06/07/2026' },
    { fecha: '05/05/2026', cups: 'ES0021000001509039QY', partner: 'CENTRAL', cliente: 'JOSE VICENTE CATALA MALONDA', status: 'Enviado', validationDate: null, activationDate: null, koDate: null, koReason: null, consumption: 1680, scoring: 0, notes: null },
    { fecha: '04/05/2026', cups: 'ES0031500199686110WW0F', partner: 'UEP GREEN COMMODITIES SL', cliente: 'COM DE PROP APARTAMENTOS CARABELA', status: 'Enviado', validationDate: null, activationDate: null, koDate: null, koReason: null, consumption: 870, scoring: 0, notes: null },
    { fecha: '04/05/2026', cups: 'ES0021000004761577AE', partner: 'VANTY', cliente: 'CENTRO DE ESTUDIOS DE ARTE Y HUMANIDADES', status: 'Activo', validationDate: '04/05/2026', activationDate: '06/05/2026', koDate: null, koReason: null, consumption: 31830, scoring: 2, notes: null },
    { fecha: '04/05/2026', cups: 'ES0031500199672002DQ0F', partner: 'UEP GREEN COMMODITIES SL', cliente: 'COM DE PROP APARTAMENTOS CARABELA', status: 'Enviado', validationDate: null, activationDate: null, koDate: null, koReason: null, consumption: 920, scoring: 0, notes: null },
    { fecha: '04/05/2026', cups: 'ES0031500199686003CX0F', partner: 'UEP GREEN COMMODITIES SL', cliente: 'COM DE PROP APARTAMENTOS CARABELA', status: 'Enviado', validationDate: null, activationDate: null, koDate: null, koReason: null, consumption: 19360, scoring: 0, notes: null },
    { fecha: '03/05/2026', cups: 'ES0021000018990895SE', partner: 'SEVERAL ENERGY', cliente: 'INSTITUTO DE DESARROLLO AGROENERGETICOS', status: 'Pdte. firma', validationDate: null, activationDate: null, koDate: null, koReason: null, consumption: 12450, scoring: 5, notes: 'OK. LO PASAMOS' },
    { fecha: '03/05/2026', cups: 'ES0027700012675001JE', partner: 'SEVERAL ENERGY', cliente: 'HOTEL PEÑA CABARGA SL', status: 'Rechazado', validationDate: null, activationDate: null, koDate: '03/05/2026', koReason: 'Scoring 10/10', consumption: 8740, scoring: 10, notes: 'RECHAZADO' },
    { fecha: '13/04/2026', cups: 'ES0021000004284805CV', partner: 'SEVERAL ENERGY', cliente: 'X-W-YANG SL', status: 'Rechazado', validationDate: null, activationDate: null, koDate: '13/04/2026', koReason: '2 incidencias', consumption: 5230, scoring: 9, notes: 'RECHAZADO - 2 INCIDENCIAS' },
  ];

  protected readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const s = this.status();
    const p = this.partner();

    return this.rows.filter((r) => {
      if (s && r.status !== s) return false;
      if (p && r.partner !== p) return false;
      if (!q) return true;
      return (
        r.cups.toLowerCase().includes(q) ||
        r.cliente.toLowerCase().includes(q) ||
        r.partner.toLowerCase().includes(q)
      );
    });
  });

  protected onStatus(event: Event): void {
    this.status.set((event.target as HTMLSelectElement).value);
  }

  protected onPartner(event: Event): void {
    this.partner.set((event.target as HTMLSelectElement).value);
  }

  protected clearFilters(): void {
    this.search.set('');
    this.status.set('');
    this.partner.set('');
  }

  protected toneFor(status: RegistrationStatus): StatusTone {
    switch (status) {
      case 'Válido':
      case 'Activo':       return 'success';
      case 'Enviado':      return 'info';
      case 'Pdte. firma':  return 'warning';
      case 'Rechazado':
      case 'KO':           return 'danger';
      case 'Baja':         return 'purple';
      default:             return 'neutral';
    }
  }
}
