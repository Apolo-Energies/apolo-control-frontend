import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { PageHeader } from '../../shared/components/page-header/page-header';
import { StatusBadge } from '../../shared/components/status-badge/status-badge';
import { Pagination } from '../../shared/components/pagination/pagination';
import { TableSkeleton } from '../../shared/components/table-skeleton/table-skeleton';
import { LoadingOverlay } from '../../shared/components/loading-overlay/loading-overlay';
import { Icon } from '../../shared/icons/icon';
import { ScoringFilter, ScoringService } from '../../core/services/scoring.service';
import { ApiErrorResponse, CustomerScoring, Page } from '../../core/models';
import { formatDate } from '../../shared/utils/format';

@Component({
  selector: 'app-scoring',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    PageHeader,
    StatusBadge,
    Pagination,
    TableSkeleton,
    LoadingOverlay,
    Icon,
  ],
  templateUrl: './scoring.html',
})
export class ScoringList {
  private readonly service = inject(ScoringService);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly result = signal<Page<CustomerScoring> | null>(null);
  protected readonly page = signal(0);
  protected readonly size = signal(20);

  protected busqueda = '';
  protected minPuntuacion = '';
  protected maxPuntuacion = '';
  protected fechaInicioVigilancia = '';
  protected fechaFinVigilancia = '';
  protected vigilanciaActiva = false;
  protected historico = false;

  protected readonly rows = computed(() => this.result()?.content ?? []);
  protected readonly totalElements = computed(() => this.result()?.totalElements ?? 0);
  protected readonly totalPages = computed(() => this.result()?.totalPages ?? 0);

  private debounce: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.reload(0);
  }

  protected reload(page: number): void {
    this.page.set(page);
    this.loading.set(true);
    this.errorMessage.set(null);

    const filter: ScoringFilter = {
      historico: this.historico,
      busqueda: this.busqueda.trim() || undefined,
      minPuntuacion: this.minPuntuacion !== '' ? Number(this.minPuntuacion) : undefined,
      maxPuntuacion: this.maxPuntuacion !== '' ? Number(this.maxPuntuacion) : undefined,
      fechaInicioVigilancia: this.fechaInicioVigilancia || undefined,
      fechaFinVigilancia: this.fechaFinVigilancia || undefined,
      vigilanciaActiva: this.vigilanciaActiva || undefined,
    };

    this.service
      .list(filter, { page, size: this.size(), sort: 'updatedAt,desc' })
      .subscribe({
        next: (res) => {
          this.result.set(res);
          this.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage.set(extractMessage(err));
          this.loading.set(false);
        },
      });
  }

  protected onSearchChange(): void {
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = setTimeout(() => this.reload(0), 300);
  }

  protected onSizeChange(size: number): void {
    this.size.set(size);
    this.reload(0);
  }

  protected onVigilanciaActivaChange(value: boolean): void {
    this.vigilanciaActiva = value;
    this.reload(0);
  }

  protected onHistoricoChange(value: boolean): void {
    this.historico = value;
    this.reload(0);
  }

  protected clearFilters(): void {
    this.busqueda = '';
    this.minPuntuacion = '';
    this.maxPuntuacion = '';
    this.fechaInicioVigilancia = '';
    this.fechaFinVigilancia = '';
    this.vigilanciaActiva = false;
    this.historico = false;
    this.reload(0);
  }

  protected scoringTone(score: number): 'success' | 'warning' | 'danger' {
    if (score <= 3) return 'success';
    if (score <= 6) return 'warning';
    return 'danger';
  }

  protected date(value: string | null): string {
    return formatDate(value);
  }
}

function extractMessage(error: HttpErrorResponse): string {
  const body = error.error as ApiErrorResponse | undefined;
  if (body?.message) return body.message;
  if (error.status === 0) return 'No se puede conectar con el servidor';
  return error.message || 'Error al cargar los scorings';
}
