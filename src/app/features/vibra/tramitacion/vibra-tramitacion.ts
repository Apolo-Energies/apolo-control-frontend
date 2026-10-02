import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { TableSkeleton } from '../../../shared/components/table-skeleton/table-skeleton';
import { Icon } from '../../../shared/icons/icon';

import { VibraAltaService } from '../../../core/services/vibra-alta.service';
import { NotificationService } from '../../../core/services/notification.service';
import { VibraAlta } from '../../../core/models';

@Component({
  selector: 'app-vibra-tramitacion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeader, TableSkeleton, Icon],
  templateUrl: './vibra-tramitacion.html',
})
export class VibraTramitacion {
  private readonly service = inject(VibraAltaService);
  private readonly notify = inject(NotificationService);

  protected readonly rows = signal<VibraAlta[]>([]);
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

  protected marcarGestionado(r: VibraAlta): void {
    this.service.marcarGestionado(r.id, { gestionado: true }).subscribe({
      next: () => { this.notify.success('Contrato gestionado'); this.load(); },
      error: (err: HttpErrorResponse) => this.notify.error(err.error?.message ?? 'Error'),
    });
  }

  protected exportExcel(): void {
    this.service.exportExcel({ gestionado: false }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'vibra-tramitacion.xlsx';
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
      },
      error: () => this.notify.error('Error al descargar Excel'),
    });
  }
}
