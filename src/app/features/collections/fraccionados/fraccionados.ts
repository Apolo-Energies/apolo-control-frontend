import {
  ChangeDetectionStrategy, Component, computed, inject, signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { PageHeader }    from '../../../shared/components/page-header/page-header';
import { TableSkeleton } from '../../../shared/components/table-skeleton/table-skeleton';
import { EmptyState }    from '../../../shared/components/empty-state/empty-state';
import { Pagination }    from '../../../shared/components/pagination/pagination';
import { Icon }          from '../../../shared/icons/icon';

import { GestionImpagoService } from '../../../core/services/gestion-impago.service';
import {
  GestionImpago, GestionImpagoTotales, Page, PagoFraccionadoEntry,
  EstadoGestionImpago,
  ESTADO_GESTION_IMPAGO_VALUES, ESTADO_GESTION_IMPAGO_LABEL,
} from '../../../core/models';

function extractMessage(err: HttpErrorResponse): string {
  return (err.error as { message?: string })?.message ?? err.message ?? 'Error inesperado';
}

type PagoStatus = 'cobrado' | 'descartado' | 'vencido' | 'hoy' | 'pendiente';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-fraccionados',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, TableSkeleton, EmptyState, Pagination, Icon, FormsModule, RouterLink],
  templateUrl: './fraccionados.html',
})
export class Fraccionados {
  private readonly service = inject(GestionImpagoService);

  protected readonly loading    = signal(false);
  protected readonly result     = signal<Page<GestionImpago> | null>(null);
  protected readonly totales    = signal<GestionImpagoTotales | null>(null);
  protected readonly error      = signal<string | null>(null);
  protected readonly savingId   = signal<string | null>(null);
  protected readonly page       = signal(0);
  protected readonly pageSize   = PAGE_SIZE;

  // ── Filtros backend ───────────────────────────────────────────────────────────
  protected q            = '';
  protected estadoFilter = '';
  protected soloVencidas = false;

  // ── Filtro de fecha: actúa sobre las fechas de cuotas (client-side) ──────────
  protected readonly startDate = signal('');
  protected readonly endDate   = signal('');

  // ── Expand ───────────────────────────────────────────────────────────────────
  protected readonly expandedId = signal<string | null>(null);

  // ── Cuotas filtradas por rango de fecha ──────────────────────────────────────
  protected filteredPagos(r: GestionImpago): PagoFraccionadoEntry[] {
    const start = this.startDate();
    const end   = this.endDate();
    if (!start && !end) return r.pagosFraccionados;
    return r.pagosFraccionados.filter(p => {
      if (!p.fecha) return false;
      if (start && p.fecha < start) return false;
      if (end   && p.fecha > end)   return false;
      return true;
    });
  }

  // ── Filas visibles: excluye registros sin cuotas (o sin cuotas en el rango) ──
  protected readonly rows = computed(() =>
    (this.result()?.content ?? []).filter(r => this.filteredPagos(r).length > 0));

  protected readonly totalElements = computed(() => this.result()?.totalElements ?? 0);
  protected readonly totalPages    = computed(() => this.result()?.totalPages ?? 0);

  // ── KPIs — sobre cuotas filtradas de la página actual ────────────────────────
  protected readonly cuotasVencidas = computed(() => {
    const hoy = this.today();
    return this.rows().reduce((s, r) =>
      s + this.filteredPagos(r).filter(p => !p.cobrado && !p.descartado && p.fecha && p.fecha <= hoy).length, 0);
  });
  protected readonly importeVencido = computed(() => {
    const hoy = this.today();
    return this.rows().reduce((s, r) =>
      s + this.filteredPagos(r)
        .filter(p => !p.cobrado && !p.descartado && p.fecha && p.fecha <= hoy)
        .reduce((ps, p) => ps + (p.importe ?? 0), 0), 0);
  });
  protected readonly importeCobrado = computed(() =>
    this.rows().reduce((s, r) =>
      s + this.filteredPagos(r).filter(p => p.cobrado).reduce((ps, p) => ps + (p.importe ?? 0), 0), 0));

  protected readonly estadoValues = ESTADO_GESTION_IMPAGO_VALUES;
  protected readonly estadoLabel  = ESTADO_GESTION_IMPAGO_LABEL;

  constructor() { this.reload(0); }

  protected reload(p: number): void {
    this.page.set(p);
    this.loading.set(true);
    this.expandedId.set(null);

    const filter = {
      pagoFraccionado: true as const,
      q:            this.q            || undefined,
      estado:       (this.estadoFilter || undefined) as EstadoGestionImpago | undefined,
      soloVencidos: this.soloVencidas || undefined,
      // startDate/endDate filtran cuotas client-side, no se envían al backend
    };

    this.service.list(filter, { page: p, size: PAGE_SIZE, sort: 'fechaDevolucion,desc' }).subscribe({
      next:  res => { this.result.set(res); this.loading.set(false); },
      error: (err: HttpErrorResponse) => { this.error.set(extractMessage(err)); this.loading.set(false); },
    });

    this.service.totales(filter).subscribe({
      next:  t  => this.totales.set(t),
      error: () => {},
    });
  }

  protected applyFilters(): void { this.reload(0); }

  protected clearFilters(): void {
    this.q            = '';
    this.estadoFilter = '';
    this.soloVencidas = false;
    this.startDate.set('');
    this.endDate.set('');
    this.reload(0);
  }

  protected onPageChange(p: number): void { this.reload(p); }

  protected toggleExpand(id: string): void {
    this.expandedId.update(curr => curr === id ? null : id);
  }

  // ── Acciones sobre cuota ──────────────────────────────────────────────────────
  protected marcarCobrada(impago: GestionImpago, cuota: PagoFraccionadoEntry): void {
    this.updatePagos(impago, impago.pagosFraccionados.map(p =>
      p.numero === cuota.numero ? { ...p, cobrado: true } : p));
  }

  protected descartar(impago: GestionImpago, cuota: PagoFraccionadoEntry): void {
    this.updatePagos(impago, impago.pagosFraccionados.map(p =>
      p.numero === cuota.numero ? { ...p, descartado: true } : p));
  }

  protected restaurar(impago: GestionImpago, cuota: PagoFraccionadoEntry): void {
    this.updatePagos(impago, impago.pagosFraccionados.map(p =>
      p.numero === cuota.numero ? { ...p, descartado: false } : p));
  }

  private updatePagos(impago: GestionImpago, pagos: PagoFraccionadoEntry[]): void {
    this.savingId.set(impago.id);
    this.service.actualizarPagosFraccionados(impago.id, pagos).subscribe({
      next: updated => {
        this.result.update(page => page ? {
          ...page,
          content: page.content.map(r =>
            r.id === impago.id ? { ...r, pagosFraccionados: updated.pagosFraccionados } : r),
        } : page);
        this.savingId.set(null);
      },
      error: () => this.savingId.set(null),
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  protected pagoStatus(p: PagoFraccionadoEntry): PagoStatus {
    if (p.descartado) return 'descartado';
    if (p.cobrado)    return 'cobrado';
    const hoy = this.today();
    if (!p.fecha)        return 'pendiente';
    if (p.fecha < hoy)   return 'vencido';
    if (p.fecha === hoy) return 'hoy';
    return 'pendiente';
  }

  protected diasRestantes(p: PagoFraccionadoEntry): number {
    if (!p.fecha) return 0;
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return Math.round((new Date(p.fecha).getTime() - t.getTime()) / 86400000);
  }

  protected cuotasSummary(r: GestionImpago): { total: number; cobradas: number; vencidas: number; descartadas: number } {
    const hoy   = this.today();
    const pagos = this.filteredPagos(r);
    return {
      total:       pagos.length,
      cobradas:    pagos.filter(p => p.cobrado).length,
      vencidas:    pagos.filter(p => !p.cobrado && !p.descartado && p.fecha && p.fecha <= hoy).length,
      descartadas: pagos.filter(p => p.descartado).length,
    };
  }

  private today(): string { return new Date().toISOString().slice(0, 10); }

  protected fmt(v: string | null | undefined): string {
    if (!v) return '—';
    const [y, m, d] = v.split('-');
    return `${d}/${m}/${y}`;
  }

  protected formatEur(v: number): string {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v);
  }
}
