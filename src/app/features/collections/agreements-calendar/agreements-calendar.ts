import {
  ChangeDetectionStrategy, Component, OnInit, computed, inject, signal,
} from '@angular/core';
import { Router } from '@angular/router';

import { PageHeader }   from '../../../shared/components/page-header/page-header';
import { Icon }         from '../../../shared/icons/icon';

import { GestionImpagoService } from '../../../core/services/gestion-impago.service';
import { CalendarioEvento }     from '../../../core/models';

interface DiaCell {
  date: Date | null;       // null = padding cell outside current month
  label: number;
  isToday: boolean;
  isPast: boolean;
  eventos: CalendarioEvento[];
}

const TIPO_LABEL: Record<string, string> = {
  verbal:  'Verbal',
  ovc:     'OVC',
  promesa: 'Promesa',
};

@Component({
  selector: 'app-agreements-calendar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, Icon],
  templateUrl: './agreements-calendar.html',
})
export class AgreementsCalendar implements OnInit {
  private readonly service = inject(GestionImpagoService);
  private readonly router  = inject(Router);

  protected readonly loading = signal(true);
  protected readonly error   = signal<string | null>(null);
  protected readonly eventos = signal<CalendarioEvento[]>([]);

  // Current month anchor — first day of displayed month
  protected readonly anchor  = signal<Date>(this.firstOfMonth(new Date()));

  protected readonly monthLabel = computed(() => {
    const d = this.anchor();
    return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  });

  protected readonly weeks = computed<DiaCell[][]>(() => {
    const anchor = this.anchor();
    const year   = anchor.getFullYear();
    const month  = anchor.getMonth();
    const today  = new Date(); today.setHours(0, 0, 0, 0);

    // Build event index: key = 'YYYY-MM-DD'
    const idx = new Map<string, CalendarioEvento[]>();
    for (const ev of this.eventos()) {
      const k = ev.fecha;
      if (!idx.has(k)) idx.set(k, []);
      idx.get(k)!.push(ev);
    }

    const firstDay = new Date(year, month, 1);
    // Monday-based week: 0=Mon...6=Sun
    let startPad = (firstDay.getDay() + 6) % 7;
    const totalDays = new Date(year, month + 1, 0).getDate();
    const cells: DiaCell[] = [];

    // Padding before
    for (let i = 0; i < startPad; i++) cells.push({ date: null, label: 0, isToday: false, isPast: false, eventos: [] });

    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(year, month, d);
      const key  = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        date,
        label: d,
        isToday: date.getTime() === today.getTime(),
        isPast:  date < today,
        eventos: idx.get(key) ?? [],
      });
    }

    // Chunk into weeks
    const pad = (7 - (cells.length % 7)) % 7;
    for (let i = 0; i < pad; i++) cells.push({ date: null, label: 0, isToday: false, isPast: false, eventos: [] });

    const result: DiaCell[][] = [];
    for (let i = 0; i < cells.length; i += 7) result.push(cells.slice(i, i + 7));
    return result;
  });

  ngOnInit(): void { this.load(); }

  protected prevMonth(): void {
    const d = this.anchor();
    this.anchor.set(this.firstOfMonth(new Date(d.getFullYear(), d.getMonth() - 1, 1)));
    this.load();
  }

  protected nextMonth(): void {
    const d = this.anchor();
    this.anchor.set(this.firstOfMonth(new Date(d.getFullYear(), d.getMonth() + 1, 1)));
    this.load();
  }

  protected goToday(): void {
    this.anchor.set(this.firstOfMonth(new Date()));
    this.load();
  }

  protected openImpago(ev: CalendarioEvento): void {
    void this.router.navigate(['/collections/unpaid', ev.impagoId]);
  }

  protected tipoLabel(tipo: string): string { return TIPO_LABEL[tipo] ?? tipo; }

  protected tipoBadgeClass(tipo: string): string {
    switch (tipo) {
      case 'verbal':  return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
      case 'ovc':     return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300';
      case 'promesa': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
      default:        return 'bg-muted text-muted-foreground';
    }
  }

  protected countByTipo(tipo: string): number {
    return this.eventos().filter(e => e.tipo === tipo).length;
  }

  protected formatEur(v: number | null): string {
    if (v == null) return '';
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    const anchor = this.anchor();
    const desde  = this.isoDate(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
    const hasta  = this.isoDate(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0));
    this.service.calendario(desde, hasta).subscribe({
      next:  (list) => { this.eventos.set(list); this.loading.set(false); },
      error: () => { this.error.set('Error cargando el calendario'); this.loading.set(false); },
    });
  }

  private firstOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), 1); }
  private isoDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
