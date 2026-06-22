import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { TableSkeleton } from '../../../shared/components/table-skeleton/table-skeleton';
import { StatusBadge, StatusTone } from '../../../shared/components/status-badge/status-badge';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { Icon } from '../../../shared/icons/icon';
import { ContractService } from '../../../core/services/contract.service';
import {
  Contract,
  ContractRenovaciones,
  ContractStatus,
  CONTRACT_STATUS_LABEL,
} from '../../../core/models';
import { formatDate, safeText } from '../../../shared/utils/format';

const STATUS_TONE: Record<ContractStatus, StatusTone> = {
  previo: 'info',
  para_estudio: 'info',
  para_tramitar: 'warning',
  para_firma: 'warning',
  valido: 'success',
  confirmado: 'info',
  activo: 'success',
  renovado: 'purple',
  finalizado: 'neutral',
  baja: 'neutral',
  ko: 'danger',
  desestimado: 'danger',
  sin_estado: 'neutral',
};

function extractMessage(err: HttpErrorResponse): string {
  return (err.error as { message?: string })?.message ?? err.message ?? 'Error inesperado';
}

const SIZE = 10;

@Component({
  selector: 'app-renovaciones',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, TableSkeleton, StatusBadge, Pagination, Icon],
  templateUrl: './renovaciones.html',
})
export class Renovaciones {
  private readonly service = inject(ContractService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly data = signal<ContractRenovaciones | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly vPage = signal(0);
  protected readonly pvPage = signal(0);
  protected readonly rPage = signal(0);

  protected readonly vOpen = signal(true);
  protected readonly pvOpen = signal(true);
  protected readonly rOpen = signal(true);

  protected readonly pageSize = SIZE;

  constructor() { this.load(); }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.getRenovaciones({
      vPage: this.vPage(), vSize: SIZE,
      pvPage: this.pvPage(), pvSize: SIZE,
      rPage: this.rPage(), rSize: SIZE,
    }).subscribe({
      next: (d) => { this.data.set(d); this.loading.set(false); },
      error: (err: HttpErrorResponse) => { this.error.set(extractMessage(err)); this.loading.set(false); },
    });
  }

  protected onVPage(p: number): void { this.vPage.set(p); this.load(); }
  protected onPvPage(p: number): void { this.pvPage.set(p); this.load(); }
  protected onRPage(p: number): void { this.rPage.set(p); this.load(); }

  protected refresh(): void {
    this.vPage.set(0); this.pvPage.set(0); this.rPage.set(0);
    this.load();
  }

  protected renovar(contract: Contract): void {
    void this.router.navigate(['/contracts'], { queryParams: { renovar: contract.id } });
  }

  protected verContrato(id: string): void {
    void this.router.navigate(['/contracts'], { queryParams: { id } });
  }

  protected tone(status: ContractStatus): StatusTone { return STATUS_TONE[status] ?? 'neutral'; }
  protected label(status: ContractStatus): string { return CONTRACT_STATUS_LABEL[status] ?? status; }
  protected date(v: string | null): string { return formatDate(v); }
  protected text(v: string | null): string { return safeText(v); }
}
