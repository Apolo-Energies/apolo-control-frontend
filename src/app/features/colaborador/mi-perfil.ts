import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule, NgForm } from '@angular/forms';

import { PageHeader } from '../../shared/components/page-header/page-header';
import { StatusBadge } from '../../shared/components/status-badge/status-badge';
import { VibraPortalService } from '../../core/services/vibra-portal.service';
import { PerfilService } from '../../core/services/perfil.service';
import { NotificationService } from '../../core/services/notification.service';
import { PASSWORD_PATTERN, PortalPerfil, TIPO_FISCAL_VIBRA_LABEL } from '../../core/models';
import { formatEuro } from '../../shared/utils/format';
import { mensajeError } from '../../shared/utils/http-error';

/** Mi perfil: datos del colaborador (los fiscales los edita administración) y cambio de contraseña. */
@Component({
  selector: 'app-mi-perfil',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, PageHeader, StatusBadge],
  templateUrl: './mi-perfil.html',
})
export class MiPerfil {
  private readonly portal = inject(VibraPortalService);
  private readonly perfilService = inject(PerfilService);
  private readonly notify = inject(NotificationService);

  protected readonly perfil = signal<PortalPerfil | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly errorPassword = signal<string | null>(null);
  protected readonly verPassword = signal(false);

  protected actual = '';
  protected nueva = '';
  protected readonly pattern = PASSWORD_PATTERN;
  protected readonly tipoLabel = TIPO_FISCAL_VIBRA_LABEL;

  constructor() {
    this.portal.perfil().subscribe({
      next: (p) => this.perfil.set(p),
      error: (err: HttpErrorResponse) => this.error.set(mensajeError(err, 'No se pudo cargar tu perfil')),
    });
  }

  protected cambiarPassword(form: NgForm): void {
    this.saving.set(true);
    this.errorPassword.set(null);
    this.perfilService.cambiarPassword(this.actual, this.nueva).subscribe({
      next: () => {
        this.saving.set(false);
        form.resetForm();
        this.notify.success('Contraseña cambiada');
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.errorPassword.set(mensajeError(err, 'No se pudo cambiar la contraseña'));
      },
    });
  }

  protected readonly eur = formatEuro;
}
