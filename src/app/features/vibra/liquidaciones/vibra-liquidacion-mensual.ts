import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';

import { ActionsMenu, ActionsMenuItem } from '../../../shared/components/actions-menu/actions-menu';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { FormDialog } from '../../../shared/components/form-dialog/form-dialog';
import { StatusBadge, StatusTone } from '../../../shared/components/status-badge/status-badge';
import { TableSkeleton } from '../../../shared/components/table-skeleton/table-skeleton';
import { Icon } from '../../../shared/icons/icon';

import { AuthService } from '../../../core/auth';
import { VibraColaboradorService } from '../../../core/services/vibra-colaborador.service';
import { VibraLiquidacionService } from '../../../core/services/vibra-liquidacion.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  EstadoLiquidacionMensual, VibraColaborador, VibraLiquidacionLinea, VibraLiquidacionMensual,
} from '../../../core/models';
import { formatDate, formatEuro, formatMonthLong } from '../../../shared/utils/format';

/** Liquidación de un colaborador y mes (como Kilowy: persona → mes a mes). */
@Component({
  selector: 'app-vibra-liquidacion-mensual',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ActionsMenu, ConfirmDialog, FormDialog, StatusBadge, TableSkeleton, Icon],
  templateUrl: './vibra-liquidacion-mensual.html',
})
export class VibraLiquidacionMensualView {
  private readonly service = inject(VibraLiquidacionService);
  private readonly colaboradorService = inject(VibraColaboradorService);
  private readonly notify = inject(NotificationService);
  private readonly auth = inject(AuthService);

  protected readonly isAdmin = this.auth.hasRole('admin');
  protected readonly colaboradores = signal<VibraColaborador[]>([]);
  protected readonly liq = signal<VibraLiquidacionMensual | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected clave = '';
  protected mes = hoyMes();

  protected readonly pagarOpen = signal(false);
  protected fechaPago = hoyIso();
  protected readonly hoy = hoyIso();
  protected readonly borrarOpen = signal(false);
  protected readonly masAcciones: ActionsMenuItem[] = [
    { label: 'Borrar liquidación', icon: 'trash', danger: true, action: () => this.borrarOpen.set(true) },
  ];

  protected readonly puedeGuardar = computed(() => {
    const l = this.liq();
    return !!l && l.estado === 'BORRADOR' && l.comisionAlta != null && l.lineas.length > 0 && l.lineasARevisar === 0;
  });

  constructor() {
    this.colaboradorService.list().subscribe({
      next: (c) => this.colaboradores.set(c),
      error: (err: HttpErrorResponse) => {
        this.colaboradores.set([]);
        this.notify.error(err.error?.message ?? 'No se pudo cargar la lista de colaboradores');
      },
    });
  }

  protected load(): void {
    if (!this.clave || !this.mes) { this.liq.set(null); return; }
    this.loading.set(true);
    this.error.set(null);
    this.service.mensual(this.clave, this.mes).subscribe({
      next: (l) => { this.liq.set(l); this.loading.set(false); },
      error: (err: HttpErrorResponse) => {
        this.liq.set(null);
        this.error.set(err.error?.message ?? 'Error al calcular la liquidación');
        this.loading.set(false);
      },
    });
  }

  protected guardar(): void {
    this.run(this.service.guardarMensual(this.clave, this.mes), 'Liquidación guardada');
  }

  protected pagar(): void {
    const id = this.liq()?.id;
    if (!id) return;
    this.run(this.service.pagarMensual(id, this.fechaPago), 'Liquidación marcada como pagada', () => this.pagarOpen.set(false));
  }

  protected borrar(): void {
    const id = this.liq()?.id;
    if (!id) return;
    this.busy.set(true);
    this.service.borrarMensual(id).subscribe({
      next: () => { this.busy.set(false); this.borrarOpen.set(false); this.notify.success('Liquidación borrada'); this.load(); },
      error: (err: HttpErrorResponse) => { this.busy.set(false); this.borrarOpen.set(false); this.notify.error(err.error?.message ?? 'No se pudo borrar'); this.load(); },
    });
  }

  protected exportar(): void {
    this.service.exportMensual(this.clave, this.mes).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        // Mismo nombre que da el servidor (VibraLiquidacionMensualController)
        a.href = url; a.download = `liquidacion_vibra_${this.clave.trim().replace(/[^A-Za-z0-9]+/g, '_')}_${this.mes}.xlsx`;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
      },
      error: () => this.notify.error('Error al descargar Excel'),
    });
  }

  private run(obs: Observable<VibraLiquidacionMensual>, ok: string, after?: () => void): void {
    this.busy.set(true);
    obs.subscribe({
      next: (l) => { this.busy.set(false); this.liq.set(l); after?.(); this.notify.success(ok); },
      // 409: otro usuario la cambió; se recarga para ver el estado real
      error: (err: HttpErrorResponse) => { this.busy.set(false); this.notify.error(err.error?.message ?? 'Error'); this.load(); },
    });
  }

  protected tipo(l: VibraLiquidacionLinea): string {
    return l.tipo === 'ANIVERSARIO' ? `Renovación (${l.aniversario}º año)` : l.tipo === 'ALTA' ? 'Alta' : 'Baja';
  }

  protected estadoTone(estado: EstadoLiquidacionMensual): StatusTone {
    return estado === 'PAGADA' ? 'success' : estado === 'GUARDADA' ? 'info' : 'neutral';
  }

  protected estadoLabel(estado: EstadoLiquidacionMensual): string {
    return estado === 'PAGADA' ? 'Pagada' : estado === 'GUARDADA' ? 'Guardada' : 'Borrador';
  }

  protected readonly eur = formatEuro;
  protected readonly fecha = formatDate;
  protected readonly mesLargo = formatMonthLong;
}

function hoyIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function hoyMes(): string {
  return hoyIso().slice(0, 7);
}
