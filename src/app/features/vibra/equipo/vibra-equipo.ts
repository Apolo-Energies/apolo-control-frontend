import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { FormDialog } from '../../../shared/components/form-dialog/form-dialog';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { TableSkeleton } from '../../../shared/components/table-skeleton/table-skeleton';
import { Icon } from '../../../shared/icons/icon';

import { AuthService } from '../../../core/auth';
import { VibraColaboradorService } from '../../../core/services/vibra-colaborador.service';
import { NotificationService } from '../../../core/services/notification.service';
import { VibraColaborador, VibraComisionHistorial } from '../../../core/models';
import { formatDateTime, formatEuro } from '../../../shared/utils/format';

/** Equipo Vibra (como Red comercial → Equipo de Kilowy): comisión por alta de cada colaborador. */
@Component({
  selector: 'app-vibra-equipo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, PageHeader, FormDialog, StatusBadge, TableSkeleton, Icon],
  templateUrl: './vibra-equipo.html',
})
export class VibraEquipo {
  private readonly service = inject(VibraColaboradorService);
  private readonly notify = inject(NotificationService);
  private readonly auth = inject(AuthService);

  protected readonly isAdmin = this.auth.hasRole('admin');
  protected readonly rows = signal<VibraColaborador[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal<string | null>(null);
  protected q = '';

  protected readonly historialDe = signal<VibraColaborador | null>(null);
  protected readonly historial = signal<VibraComisionHistorial[]>([]);
  protected readonly historialLoading = signal(false);

  constructor() { this.load(); }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.list(this.q || undefined).subscribe({
      next: (r) => { this.rows.set(r); this.loading.set(false); },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message ?? 'Error al cargar el equipo');
        this.loading.set(false);
      },
    });
  }

  /** Guarda al salir del campo o con Enter; vacío o igual al actual no hace nada. */
  protected guardarComision(c: VibraColaborador, input: HTMLInputElement): void {
    const vacio = input.value === '';
    if (vacio || !input.checkValidity()) {
      if (!vacio) this.notify.error('Comisión no válida: importe ≥ 0 con 2 decimales');
      input.value = c.comisionAlta?.toString() ?? '';
      return;
    }
    const valor = Math.round(Number(input.value) * 100) / 100;
    if (valor === c.comisionAlta) return;
    this.saving.set(c.clave);
    this.service.cambiarComision(c.clave, valor).subscribe({
      next: (r) => {
        this.saving.set(null);
        this.rows.update(list => list.map(x => (x.clave === r.clave ? r : x)));
        this.notify.success(`Comisión de ${r.nombre}: ${this.eur(r.comisionAlta)}`);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(null);
        input.value = c.comisionAlta?.toString() ?? '';
        this.notify.error(err.error?.message ?? 'No se pudo guardar la comisión');
      },
    });
  }

  protected verHistorial(c: VibraColaborador): void {
    this.historialDe.set(c);
    this.historialLoading.set(true);
    this.service.historial(c.clave).subscribe({
      next: (h) => { this.historial.set(h); this.historialLoading.set(false); },
      error: (err: HttpErrorResponse) => {
        this.historialLoading.set(false);
        this.historialDe.set(null);
        this.notify.error(err.error?.message ?? 'No se pudo cargar el histórico');
      },
    });
  }

  protected cerrarHistorial(): void { this.historialDe.set(null); }

  protected readonly eur = formatEuro;
  protected readonly fecha = formatDateTime;
}
