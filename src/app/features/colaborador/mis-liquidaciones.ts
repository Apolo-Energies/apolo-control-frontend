import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { PageHeader } from '../../shared/components/page-header/page-header';
import { StatusBadge } from '../../shared/components/status-badge/status-badge';
import { TableSkeleton } from '../../shared/components/table-skeleton/table-skeleton';
import { Icon } from '../../shared/icons/icon';
import { VibraPortalService } from '../../core/services/vibra-portal.service';
import { NotificationService } from '../../core/services/notification.service';
import { PortalLiquidacion } from '../../core/models';
import { formatDate, formatEuro } from '../../shared/utils/format';
import { mensajeError, mensajeErrorBlob } from '../../shared/utils/http-error';

const MES = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** Mis liquidaciones mensuales y su autofactura. */
@Component({
  selector: 'app-mis-liquidaciones',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, StatusBadge, TableSkeleton, Icon],
  templateUrl: './mis-liquidaciones.html',
})
export class MisLiquidaciones {
  private readonly service = inject(VibraPortalService);
  private readonly notify = inject(NotificationService);

  protected readonly rows = signal<PortalLiquidacion[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly descargando = signal<string | null>(null);

  constructor() { this.load(); }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.liquidaciones().subscribe({
      next: (r) => { this.rows.set(r); this.loading.set(false); },
      error: (err: HttpErrorResponse) => {
        this.error.set(mensajeError(err, 'Error al cargar tus liquidaciones'));
        this.loading.set(false);
      },
    });
  }

  /** Descarga la autofactura; la primera vez el servidor le pone número. */
  protected descargar(l: PortalLiquidacion): void {
    this.descargando.set(l.id);
    this.service.autofactura(l.id).subscribe({
      next: (blob) => {
        this.descargando.set(null);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${l.autofacturaNumero ?? 'autofactura_' + l.mes}.pdf`;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
        if (!l.autofacturaNumero) this.load();
      },
      error: async (err: HttpErrorResponse) => {
        this.descargando.set(null);
        this.notify.error(await mensajeErrorBlob(err, 'No se pudo generar la autofactura'));
      },
    });
  }

  protected mes(ym: string): string {
    const d = new Date(`${ym}-01T00:00:00Z`);
    return Number.isNaN(d.getTime()) ? ym : MES.format(d);
  }

  protected readonly eur = formatEuro;
  protected readonly fecha = formatDate;
}
