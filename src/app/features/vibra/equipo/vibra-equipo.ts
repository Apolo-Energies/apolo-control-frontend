import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { ActionsMenu, ActionsMenuItem } from '../../../shared/components/actions-menu/actions-menu';
import { FormDialog } from '../../../shared/components/form-dialog/form-dialog';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { TableSkeleton } from '../../../shared/components/table-skeleton/table-skeleton';
import { Icon } from '../../../shared/icons/icon';
import { RowLink } from '../../../shared/directives/row-link';

import { AuthService } from '../../../core/auth';
import { VibraColaboradorService } from '../../../core/services/vibra-colaborador.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import {
  DatosFiscalesColaborador,
  PASSWORD_PATTERN,
  TIPO_FISCAL_VIBRA_LABEL,
  VibraColaborador,
  VibraComisionHistorial,
} from '../../../core/models';
import { mensajeError } from '../../../shared/utils/http-error';
import { formatDateTime, formatEuro } from '../../../shared/utils/format';

/**
 * Equipo Vibra (como Red comercial → Equipo de Kilowy): comisión por alta, datos fiscales de la
 * autofactura y acceso de cada colaborador a su portal.
 */
@Component({
  selector: 'app-vibra-equipo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, PageHeader, ActionsMenu, FormDialog, StatusBadge, TableSkeleton, Icon, RowLink],
  templateUrl: './vibra-equipo.html',
})
export class VibraEquipo {
  private readonly service = inject(VibraColaboradorService);
  private readonly notify = inject(NotificationService);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmService);

  protected readonly isAdmin = this.auth.hasRole('admin');
  protected readonly rows = signal<VibraColaborador[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal<string | null>(null);
  protected q = '';

  protected readonly historialDe = signal<VibraColaborador | null>(null);
  protected readonly historial = signal<VibraComisionHistorial[]>([]);
  protected readonly historialLoading = signal(false);

  // Dar acceso
  protected readonly accesoDe = signal<VibraColaborador | null>(null);
  protected readonly accesoSaving = signal(false);
  protected readonly accesoError = signal<string | null>(null);
  protected readonly verPassword = signal(false);
  protected acceso = { email: '', password: '' };
  protected readonly passwordPattern = PASSWORD_PATTERN;

  // Datos fiscales
  protected readonly fiscalDe = signal<VibraColaborador | null>(null);
  protected readonly fiscalSaving = signal(false);
  protected readonly fiscalError = signal<string | null>(null);
  protected fiscal: DatosFiscalesColaborador = VibraEquipo.fiscalVacio();
  protected readonly tiposFiscales = Object.entries(TIPO_FISCAL_VIBRA_LABEL);

  /** Acciones de cada fila (solo admin). */
  protected readonly menus = computed(() => {
    const ocupado = this.saving();
    return new Map(this.rows().map((c): [string, ActionsMenuItem[]] => [c.clave, [
      { label: 'Datos fiscales', icon: 'edit', action: () => this.abrirFiscal(c) },
      this.accesoItem(c, ocupado === c.clave),
    ]]));
  });

  private accesoItem(c: VibraColaborador, ocupado: boolean): ActionsMenuItem {
    if (!c.accesoEmail) return { label: 'Dar acceso al portal', icon: 'user', action: () => this.abrirAcceso(c) };
    if (c.accesoActivo) {
      return { label: 'Quitar acceso', icon: 'log-out', danger: true, separatorBefore: true, disabled: ocupado, action: () => void this.cambiarAcceso(c) };
    }
    return { label: 'Reactivar acceso', icon: 'user', disabled: ocupado, action: () => void this.cambiarAcceso(c) };
  }

  constructor() { this.load(); }

  private reemplazar(r: VibraColaborador): void {
    this.rows.update(list => list.map(x => (x.clave === r.clave ? r : x)));
  }

  // ── Acceso al portal ──────────────────────────────────────────

  protected abrirAcceso(c: VibraColaborador): void {
    this.acceso = { email: '', password: '' };
    this.accesoError.set(null);
    this.verPassword.set(false);
    this.accesoDe.set(c);
  }

  protected cerrarAcceso(): void { this.accesoDe.set(null); }

  protected darAcceso(): void {
    const c = this.accesoDe();
    if (!c) return;
    this.accesoSaving.set(true);
    this.accesoError.set(null);
    this.service.darAcceso(c.clave, this.acceso.email.trim(), this.acceso.password).subscribe({
      next: (r) => {
        this.accesoSaving.set(false);
        this.reemplazar(r);
        this.accesoDe.set(null);
        this.notify.success(`${r.nombre} ya puede entrar con ${r.accesoEmail}`);
      },
      error: (err: HttpErrorResponse) => {
        this.accesoSaving.set(false);
        this.accesoError.set(mensajeError(err, 'No se pudo dar acceso'));
      },
    });
  }

  protected async cambiarAcceso(c: VibraColaborador): Promise<void> {
    const activar = !c.accesoActivo;
    const ok = await this.confirm.ask({
      header: activar ? 'Reactivar acceso' : 'Quitar acceso',
      message: activar
        ? `${c.nombre} podrá volver a entrar con ${c.accesoEmail}.`
        : `${c.nombre} no podrá entrar a su portal hasta que se reactive.`,
      acceptLabel: activar ? 'Reactivar' : 'Quitar acceso',
      variant: activar ? 'default' : 'danger',
    });
    if (!ok) return;
    this.saving.set(c.clave);
    this.service.cambiarAcceso(c.clave, activar).subscribe({
      next: (r) => {
        this.saving.set(null);
        this.reemplazar(r);
        this.notify.success(activar ? `Acceso de ${r.nombre} reactivado` : `Acceso de ${r.nombre} quitado`);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(null);
        this.notify.error(mensajeError(err, 'No se pudo cambiar el acceso'));
      },
    });
  }

  // ── Datos fiscales ────────────────────────────────────────────

  private static fiscalVacio(): DatosFiscalesColaborador {
    return { tipoFiscal: null, nombreFiscal: null, nifFiscal: null, direccionFiscal: null, iban: null, ivaPct: 21, irpfPct: 0 };
  }

  protected abrirFiscal(c: VibraColaborador): void {
    this.fiscal = {
      tipoFiscal: c.tipoFiscal,
      nombreFiscal: c.nombreFiscal,
      nifFiscal: c.nifFiscal,
      direccionFiscal: c.direccionFiscal,
      iban: c.iban,
      ivaPct: c.ivaPct ?? 21,
      irpfPct: c.irpfPct ?? 0,
    };
    this.fiscalError.set(null);
    this.fiscalDe.set(c);
  }

  protected cerrarFiscal(): void { this.fiscalDe.set(null); }

  protected guardarFiscal(): void {
    const c = this.fiscalDe();
    if (!c) return;
    this.fiscalSaving.set(true);
    this.fiscalError.set(null);
    this.service.cambiarDatosFiscales(c.clave, this.fiscal).subscribe({
      next: (r) => {
        this.fiscalSaving.set(false);
        this.reemplazar(r);
        this.fiscalDe.set(null);
        this.notify.success(`Datos fiscales de ${r.nombre} guardados`);
      },
      error: (err: HttpErrorResponse) => {
        this.fiscalSaving.set(false);
        this.fiscalError.set(mensajeError(err, 'No se pudieron guardar los datos fiscales'));
      },
    });
  }

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
