import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { TableSkeleton } from '../../../shared/components/table-skeleton/table-skeleton';
import { FormDialog } from '../../../shared/components/form-dialog/form-dialog';
import { Icon, IconName } from '../../../shared/icons/icon';

import { VibraRenovacionService } from '../../../core/services/vibra-renovacion.service';
import { VibraDashboardService } from '../../../core/services/vibra-dashboard.service';
import { ListStateService } from '../../../core/services/list-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { COMERCIALIZADORA_VIBRA_VALUES, VibraAlta, VibraRenovaciones as Renovaciones } from '../../../core/models';
import { formatDate, safeText } from '../../../shared/utils/format';

type SortCol = 'titular' | 'cups' | 'colaborador' | 'comercializadora'
             | 'fechaActivacionContrato' | 'fechaRenovacion' | 'consumo';

type Estado = {
  q: string; colaborador: string; comercializadora: string; fechaDesde: string; fechaHasta: string;
  vPage: number; pvPage: number; pageSize: number; sortCol: SortCol; sortDir: 'asc' | 'desc';
};

function extractMessage(err: HttpErrorResponse): string {
  return (err.error as { message?: string })?.message ?? err.message ?? 'Error inesperado';
}

@Component({
  selector: 'app-vibra-renovaciones',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, NgTemplateOutlet, PageHeader, Pagination, TableSkeleton, FormDialog, Icon],
  templateUrl: './vibra-renovaciones.html',
})
export class VibraRenovaciones implements OnDestroy {
  private readonly service = inject(VibraRenovacionService);
  private readonly dashboardService = inject(VibraDashboardService);
  private readonly listState = inject(ListStateService);
  private readonly notify = inject(NotificationService);
  private readonly searchChange$ = new Subject<void>();
  private readonly reload$ = new Subject<void>();

  protected readonly loading = signal(false);
  protected readonly data = signal<Renovaciones | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly exporting = signal(false);

  protected readonly vPage = signal(0);
  protected readonly pvPage = signal(0);
  protected readonly pageSize = signal(10);

  protected readonly vOpen = signal(true);
  protected readonly pvOpen = signal(true);

  protected readonly q = signal('');
  protected readonly colaborador = signal('');
  protected readonly comercializadora = signal('');
  protected readonly fechaDesde = signal('');
  protected readonly fechaHasta = signal('');

  protected readonly sortCol = signal<SortCol>('fechaRenovacion');
  protected readonly sortDir = signal<'asc' | 'desc'>('asc');

  protected readonly colaboradores = signal<string[]>([]);
  protected readonly comercializadoras = COMERCIALIZADORA_VIBRA_VALUES;

  // Edición de comentarios
  protected readonly editing = signal<VibraAlta | null>(null);
  protected editComentarios = '';
  protected readonly editSaving = signal(false);
  protected readonly editError = signal<string | null>(null);

  constructor() {
    this.searchChange$.pipe(debounceTime(400), takeUntilDestroyed()).subscribe(() => this.applyFilters());
    // switchMap cancela la petición anterior: la tabla siempre corresponde a los últimos filtros.
    this.reload$.pipe(
      switchMap(() => this.service.list(this.filter(), {
        vPage: this.vPage(), vSize: this.pageSize(), pvPage: this.pvPage(), pvSize: this.pageSize(),
      }).pipe(catchError((err: HttpErrorResponse) => { this.error.set(extractMessage(err)); return of(null); }))),
      takeUntilDestroyed(),
    ).subscribe((d) => {
      if (d && this.paginaFueraDeRango(d)) return;
      if (d) this.data.set(d);
      this.loading.set(false);
    });
    const s = this.listState.get<Estado>('vibra-renovaciones');
    if (s) {
      this.q.set(s.q);
      this.colaborador.set(s.colaborador);
      this.comercializadora.set(s.comercializadora);
      this.fechaDesde.set(s.fechaDesde);
      this.fechaHasta.set(s.fechaHasta);
      this.vPage.set(s.vPage);
      this.pvPage.set(s.pvPage);
      this.pageSize.set(s.pageSize);
      if (s.sortCol) { this.sortCol.set(s.sortCol); this.sortDir.set(s.sortDir); }
    }
    this.load();
    this.dashboardService.get().subscribe({
      next: (d) => this.colaboradores.set(d.ranking.map(r => r.colaborador)),
      error: () => this.colaboradores.set([]),
    });
  }

  ngOnDestroy(): void {
    this.listState.save('vibra-renovaciones', {
      q: this.q(), colaborador: this.colaborador(), comercializadora: this.comercializadora(),
      fechaDesde: this.fechaDesde(), fechaHasta: this.fechaHasta(),
      vPage: this.vPage(), pvPage: this.pvPage(), pageSize: this.pageSize(),
      sortCol: this.sortCol(), sortDir: this.sortDir(),
    });
  }

  private filter() {
    return {
      q: this.q() || undefined,
      colaborador: this.colaborador() || undefined,
      comercializadora: this.comercializadora() || undefined,
      fechaDesde: this.fechaDesde() || undefined,
      fechaHasta: this.fechaHasta() || undefined,
      sort: `${this.sortCol()},${this.sortDir()}`,
    };
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.reload$.next();
  }

  /** Página guardada que ya no existe (p. ej. tras renovar altas): vuelve a la última y recarga. */
  private paginaFueraDeRango(d: Renovaciones): boolean {
    const v = d.vencidos.totalPages, pv = d.porVencer.totalPages;
    const vFuera = this.vPage() > 0 && this.vPage() >= v;
    const pvFuera = this.pvPage() > 0 && this.pvPage() >= pv;
    if (!vFuera && !pvFuera) return false;
    if (vFuera) this.vPage.set(Math.max(v - 1, 0));
    if (pvFuera) this.pvPage.set(Math.max(pv - 1, 0));
    this.load();
    return true;
  }

  protected onQChange(): void { this.searchChange$.next(); }

  protected applyFilters(): void {
    this.vPage.set(0);
    this.pvPage.set(0);
    this.load();
  }

  protected get hasFilters(): boolean {
    return !!(this.q() || this.colaborador() || this.comercializadora() || this.fechaDesde() || this.fechaHasta());
  }

  protected clearFilters(): void {
    this.q.set('');
    this.colaborador.set('');
    this.comercializadora.set('');
    this.fechaDesde.set('');
    this.fechaHasta.set('');
    this.applyFilters();
  }

  protected onVPage(p: number): void { this.vPage.set(p); this.load(); }
  protected onPvPage(p: number): void { this.pvPage.set(p); this.load(); }
  protected onSizeChange(size: number): void { this.pageSize.set(size); this.applyFilters(); }

  protected setSort(col: SortCol): void {
    if (this.sortCol() === col) {
      this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortCol.set(col);
      this.sortDir.set('asc');
    }
    this.applyFilters();
  }

  protected sortIcon(col: SortCol): IconName {
    if (this.sortCol() !== col) return 'arrow-down';
    return this.sortDir() === 'asc' ? 'arrow-up' : 'arrow-down';
  }

  protected sortIconClass(col: SortCol): string {
    return this.sortCol() === col ? 'text-primary' : 'opacity-25';
  }

  protected openEdit(row: VibraAlta): void {
    this.editing.set(row);
    this.editComentarios = row.comentarios ?? '';
    this.editError.set(null);
  }

  protected closeEdit(): void { this.editing.set(null); }

  protected submitEdit(): void {
    const row = this.editing();
    if (!row) return;
    this.editSaving.set(true);
    this.editError.set(null);
    this.service.actualizarComentarios(row.id, this.editComentarios || null).subscribe({
      next: (updated) => {
        this.data.update(d => {
          if (!d) return d;
          const patch = (rows: VibraAlta[]) =>
            rows.map(r => r.id === updated.id ? { ...r, comentarios: updated.comentarios } : r);
          return {
            ...d,
            vencidos: { ...d.vencidos, content: patch(d.vencidos.content) },
            porVencer: { ...d.porVencer, content: patch(d.porVencer.content) },
          };
        });
        this.editSaving.set(false);
        this.notify.success('Comentario guardado');
        this.closeEdit();
      },
      error: (err: HttpErrorResponse) => {
        this.editSaving.set(false);
        this.editError.set(extractMessage(err));
      },
    });
  }

  protected copyCups(cups: string | null): void {
    if (!cups) return;
    navigator.clipboard.writeText(cups).then(() => this.notify.success(`CUPS copiado: ${cups}`));
  }

  protected exportExcel(): void {
    if (this.exporting()) return;
    this.exporting.set(true);
    this.service.exportExcel(this.filter()).subscribe({
      next: (blob) => {
        this.exporting.set(false);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'vibra-renovaciones.xlsx';
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
      },
      error: () => { this.exporting.set(false); this.notify.error('Error al descargar Excel'); },
    });
  }

  protected date(v: string | null): string { return formatDate(v); }
  protected text(v: string | null): string { return safeText(v); }

  protected fmtNumber(n: number | null): string {
    if (n == null) return '—';
    return new Intl.NumberFormat('es-ES').format(n);
  }
}
