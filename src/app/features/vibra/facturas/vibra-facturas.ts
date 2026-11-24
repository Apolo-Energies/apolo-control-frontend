import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { TableSkeleton } from '../../../shared/components/table-skeleton/table-skeleton';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { Icon } from '../../../shared/icons/icon';
import { formatDate, formatDateTime, formatEuro, parseDecimal } from '../../../shared/utils/format';
import { mensajeError } from '../../../shared/utils/http-error';

import { VibraFacturaService } from '../../../core/services/vibra-factura.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  ESTADO_FACTURA_VIBRA_LABEL, EstadoFacturaVibra, Page, VibraFacturaConteos, VibraFacturaFilter, VibraFacturaListItem,
} from '../../../core/models';
import { descargarBlob, estadoFacturaTone } from './vibra-factura-ui';

type Pestana = 'TODAS' | EstadoFacturaVibra | 'SIN_ENVIAR' | 'ENVIADA';

const PESTANAS: { id: Pestana; label: string }[] = [
  { id: 'TODAS', label: 'Todas' },
  { id: 'BORRADOR', label: 'Borrador' },
  { id: 'EMITIDA', label: 'Emitida' },
  { id: 'PAGADA', label: 'Pagada' },
  { id: 'IMPAGADA', label: 'Impagada' },
  { id: 'DEVUELTA', label: 'Devuelta' },
  { id: 'SIN_ENVIAR', label: 'Sin enviar' },
  { id: 'ENVIADA', label: 'Enviadas' },
];

/** Facturas de venta Vibra (como Facturas de Kilowy): pestañas por estado y envío, búsqueda y Excel. */
@Component({
  selector: 'app-vibra-facturas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, PageHeader, Pagination, TableSkeleton, StatusBadge, Icon],
  templateUrl: './vibra-facturas.html',
})
export class VibraFacturas {
  private readonly service = inject(VibraFacturaService);
  private readonly notify = inject(NotificationService);

  protected readonly pestanas = PESTANAS;
  protected readonly estadoLabel = ESTADO_FACTURA_VIBRA_LABEL;
  protected readonly tone = estadoFacturaTone;
  protected readonly euro = formatEuro;
  protected readonly fecha = formatDate;
  protected readonly fechaHora = formatDateTime;

  protected readonly result = signal<Page<VibraFacturaListItem> | null>(null);
  protected readonly conteos = signal<VibraFacturaConteos>({});
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly page = signal(0);
  protected readonly size = signal(20);
  protected readonly tab = signal<Pestana>('TODAS');
  protected q = '';
  protected desde = '';
  protected hasta = '';
  protected importe = '';

  protected readonly rows = computed(() => this.result()?.content ?? []);
  protected readonly total = computed(() => this.result()?.totalElements ?? 0);
  protected readonly totalPages = computed(() => this.result()?.totalPages ?? 0);

  constructor() { this.load(); }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    const filtro = this.filtro();
    this.service.list(filtro, { page: this.page(), size: this.size(), sort: 'createdAt,desc' }).subscribe({
      next: (r) => { this.result.set(r); this.loading.set(false); },
      error: (err: HttpErrorResponse) => {
        this.error.set(mensajeError(err, 'Error al cargar las facturas'));
        this.loading.set(false);
      },
    });
    this.service.conteos(filtro).subscribe({ next: (c) => this.conteos.set(c), error: () => this.conteos.set({}) });
  }

  protected elegir(p: Pestana): void { this.tab.set(p); this.buscar(); }
  protected buscar(): void { this.page.set(0); this.load(); }
  protected onPage(p: number): void { this.page.set(p); this.load(); }
  protected onPageSize(s: number): void { this.size.set(s); this.page.set(0); this.load(); }

  protected limpiar(): void {
    this.q = ''; this.desde = ''; this.hasta = ''; this.importe = '';
    this.buscar();
  }

  protected exportExcel(): void {
    this.service.exportExcel(this.filtro()).subscribe({
      next: (blob) => descargarBlob(blob, 'vibra_facturas.xlsx'),
      error: () => this.notify.error('Error al descargar Excel'),
    });
  }

  private filtro(): VibraFacturaFilter {
    const t = this.tab();
    const importe = parseDecimal(this.importe);
    return {
      estado: t === 'TODAS' || t === 'SIN_ENVIAR' || t === 'ENVIADA' ? undefined : t,
      envio: t === 'SIN_ENVIAR' ? 'no' : t === 'ENVIADA' ? 'si' : undefined,
      q: this.q.trim() || undefined,
      desde: this.desde || undefined,
      hasta: this.hasta || undefined,
      importe: importe === null || Number.isNaN(importe) ? undefined : importe,
    };
  }
}
