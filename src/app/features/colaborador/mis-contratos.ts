import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { PageHeader } from '../../shared/components/page-header/page-header';
import { Pagination } from '../../shared/components/pagination/pagination';
import { StatusBadge } from '../../shared/components/status-badge/status-badge';
import { TableSkeleton } from '../../shared/components/table-skeleton/table-skeleton';
import { Icon } from '../../shared/icons/icon';
import { VibraPortalService } from '../../core/services/vibra-portal.service';
import { ESTADO_VIBRA_ALTA_VALUES, Page, PortalContrato } from '../../core/models';
import { formatDate } from '../../shared/utils/format';
import { mensajeError } from '../../shared/utils/http-error';
import { estadoLabel, estadoTone } from './estado-contrato';

/** Mis contratos: las altas Vibra a nombre del colaborador. */
@Component({
  selector: 'app-mis-contratos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, PageHeader, Pagination, StatusBadge, TableSkeleton, Icon],
  templateUrl: './mis-contratos.html',
})
export class MisContratos {
  private readonly service = inject(VibraPortalService);

  protected readonly result = signal<Page<PortalContrato> | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly page = signal(0);
  protected readonly size = signal(20);
  protected q = '';
  protected estado = '';

  protected readonly rows = computed(() => this.result()?.content ?? []);
  protected readonly total = computed(() => this.result()?.totalElements ?? 0);
  protected readonly totalPages = computed(() => this.result()?.totalPages ?? 0);
  protected readonly estados = ESTADO_VIBRA_ALTA_VALUES;

  constructor() { this.load(); }

  protected buscar(): void {
    this.page.set(0);
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.contratos({ q: this.q || undefined, estado: this.estado || undefined },
      { page: this.page(), size: this.size(), sort: 'fecha,desc' }).subscribe({
      next: (r) => { this.result.set(r); this.loading.set(false); },
      error: (err: HttpErrorResponse) => {
        this.error.set(mensajeError(err, 'Error al cargar tus contratos'));
        this.loading.set(false);
      },
    });
  }

  protected onPage(p: number): void { this.page.set(p); this.load(); }
  protected onPageSize(s: number): void { this.size.set(s); this.page.set(0); this.load(); }

  protected readonly fecha = formatDate;
  protected readonly estadoLabel = estadoLabel;
  protected readonly estadoTone = estadoTone;
}
