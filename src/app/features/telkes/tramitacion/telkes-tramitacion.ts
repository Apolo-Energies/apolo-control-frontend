import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { TableSkeleton } from '../../../shared/components/table-skeleton/table-skeleton';
import { Icon } from '../../../shared/icons/icon';

import { TelkesAltaService } from '../../../core/services/telkes-alta.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TelkesAlta } from '../../../core/models';

@Component({
  selector: 'app-telkes-tramitacion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeader, TableSkeleton, Icon],
  templateUrl: './telkes-tramitacion.html',
})
export class TelkesTramitacion {
  private readonly service = inject(TelkesAltaService);
  private readonly notify = inject(NotificationService);

  protected readonly rows = signal<TelkesAlta[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly total = computed(() => this.rows().length);

  constructor() { this.load(); }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.tramitacion().subscribe({
      next: (r) => { this.rows.set(r); this.loading.set(false); },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message ?? err.message ?? 'Error al cargar');
        this.loading.set(false);
      },
    });
  }

  protected marcarGestionado(r: TelkesAlta): void {
    this.service.marcarGestionado(r.id, { gestionado: true }).subscribe({
      next: () => { this.notify.success('Contrato gestionado'); this.load(); },
      error: (err: HttpErrorResponse) => this.notify.error(err.error?.message ?? 'Error'),
    });
  }

}
