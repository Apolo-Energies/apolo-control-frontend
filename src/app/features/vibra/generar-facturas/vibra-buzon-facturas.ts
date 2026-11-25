import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';

import { Pagination } from '../../../shared/components/pagination/pagination';
import { StatusBadge, StatusTone } from '../../../shared/components/status-badge/status-badge';
import { TableSkeleton } from '../../../shared/components/table-skeleton/table-skeleton';
import { Icon } from '../../../shared/icons/icon';
import { formatDateTime } from '../../../shared/utils/format';
import { mensajeError, mensajeErrorBlob } from '../../../shared/utils/http-error';
import { abrirBlob } from '../facturas/vibra-factura-ui';

import { VibraBuzonService } from '../../../core/services/vibra-buzon.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  ESTADO_BUZON_CORREO_LABEL, EstadoBuzonCorreo, Page, VibraBuzonCorreo, VibraBuzonEstado,
} from '../../../core/models';

/** Hora de un cron diario «s m h * * *»; null si es otro horario. */
function horaCron(cron: string): string | null {
  const m = /^0 (\d{1,2}) (\d{1,2}) \* \* \*$/.exec(cron.trim());
  return m ? `${m[2].padStart(2, '0')}:${m[1].padStart(2, '0')}` : null;
}

/**
 * Buzón de facturas de compra (como «Correo de facturas» de Kilowy): estado de la lectura diaria,
 * «Leer ahora» y los correos leídos con lo que se hizo con cada uno.
 */
@Component({
  selector: 'app-vibra-buzon-facturas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Pagination, StatusBadge, TableSkeleton, Icon],
  templateUrl: './vibra-buzon-facturas.html',
})
export class VibraBuzonFacturas {
  private readonly service = inject(VibraBuzonService);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private sondeo: ReturnType<typeof setTimeout> | null = null;

  protected readonly estadoLabel = ESTADO_BUZON_CORREO_LABEL;
  protected readonly fmtFechaHora = formatDateTime;

  protected readonly estado = signal<VibraBuzonEstado | null>(null);
  protected readonly result = signal<Page<VibraBuzonCorreo> | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly page = signal(0);
  protected readonly size = signal(20);
  protected readonly soloPendientes = signal(false);
  protected readonly leyendo = signal(false);
  /** Resultado de «Leer ahora», para el lector de pantalla. */
  protected readonly aviso = signal<string | null>(null);
  protected readonly reintentando = signal<string | null>(null);

  protected readonly rows = computed(() => this.result()?.content ?? []);
  protected readonly total = computed(() => this.result()?.totalElements ?? 0);
  protected readonly totalPages = computed(() => this.result()?.totalPages ?? 0);
  protected readonly pendientes = computed(() => (this.estado()?.noProcesados ?? 0) + (this.estado()?.errores ?? 0));
  protected readonly horario = computed(() => {
    const e = this.estado();
    if (!e) return '';
    const h = horaCron(e.cron);
    return h ? `cada día a las ${h}` : `con el horario ${e.cron}`;
  });

  constructor() {
    this.cargarEstado();
    this.load();
    this.destroyRef.onDestroy(() => { if (this.sondeo) clearTimeout(this.sondeo); });
  }

  /** Mientras haya una lectura en curso se vuelve a mirar cada 3 s; al terminar, se recarga la lista. */
  protected cargarEstado(): void {
    this.service.estado().subscribe({
      next: (e) => {
        const terminada = (this.leyendo() || !!this.estado()?.leyendo) && !e.leyendo;
        this.estado.set(e);
        if (e.leyendo) {
          this.sondeo = setTimeout(() => this.cargarEstado(), 3000);
        } else if (terminada) {
          this.leyendo.set(false);
          this.aviso.set(e.ultimoResultado === 'ERROR' ? `La lectura falló: ${e.ultimoDetalle ?? ''}` : `Lectura terminada: ${e.ultimoDetalle ?? ''}`);
          this.load();
        }
      },
      error: (err: HttpErrorResponse) => {
        this.leyendo.set(false);
        this.error.set(mensajeError(err, 'No se pudo cargar el estado del buzón'));
      },
    });
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.list(this.soloPendientes(), { page: this.page(), size: this.size() }).subscribe({
      next: (r) => { this.result.set(r); this.loading.set(false); },
      error: (err: HttpErrorResponse) => {
        this.error.set(mensajeError(err, 'No se pudieron cargar los correos del buzón'));
        this.loading.set(false);
      },
    });
  }

  protected filtrar(solo: boolean): void {
    this.soloPendientes.set(solo);
    this.page.set(0);
    this.load();
  }

  protected onPage(p: number): void { this.page.set(p); this.load(); }
  protected onPageSize(s: number): void { this.size.set(s); this.page.set(0); this.load(); }

  protected leer(): void {
    if (this.leyendo()) return;
    this.leyendo.set(true);
    this.aviso.set(null);
    this.service.leer().subscribe({
      next: () => {
        this.aviso.set('Leyendo el buzón…');
        this.cargarEstado();
      },
      error: (err: HttpErrorResponse) => {
        this.leyendo.set(false);
        this.notify.error(mensajeError(err, 'No se pudo leer el buzón'));
        this.cargarEstado();
      },
    });
  }

  protected reintentar(c: VibraBuzonCorreo): void {
    if (this.reintentando()) return;
    this.reintentando.set(c.id);
    this.service.reintentar(c.id).subscribe({
      next: (r) => {
        this.reintentando.set(null);
        if (r.estado === 'PROCESADO') this.notify.success(r.motivo ?? 'Borrador creado');
        else this.notify.error(r.motivo ?? 'Sigue sin procesarse');
        this.cargarEstado();
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.reintentando.set(null);
        this.notify.error(mensajeError(err, 'No se pudo reintentar'));
      },
    });
  }

  protected verPdf(c: VibraBuzonCorreo): void {
    this.service.pdf(c.id).subscribe({
      next: abrirBlob,
      error: async (err: HttpErrorResponse) => this.notify.error(await mensajeErrorBlob(err, 'No se pudo abrir el PDF')),
    });
  }

  protected puedeReintentar(c: VibraBuzonCorreo): boolean {
    return (c.estado === 'NO_PROCESADO' || c.estado === 'ERROR') && (c.tienePdf || !!c.enlace);
  }

  protected tone(e: EstadoBuzonCorreo): StatusTone {
    switch (e) {
      case 'PROCESADO': return 'success';
      case 'NO_PROCESADO': return 'warning';
      case 'ERROR': return 'danger';
      case 'DESCARTADO': return 'neutral';
    }
  }
}
