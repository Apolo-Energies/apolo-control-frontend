import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../shared/services/theme';
import { Icon, IconName } from '../../shared/icons/icon';

/**
 * Layout del portal del colaborador Vibra. Mínimo a propósito: sin datos maestros,
 * notificaciones ni nada del layout interno (con este rol darían 403 y cerrarían la sesión).
 */
@Component({
  selector: 'app-colaborador-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  templateUrl: './colaborador-layout.html',
})
export class ColaboradorLayout {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly theme = inject(ThemeService);

  protected readonly nombre = this.auth.user()?.nombre ?? '';

  /** `corto`: etiqueta de la barra inferior en móvil. */
  protected readonly enlaces: { url: string; label: string; corto: string; icon: IconName; exact: boolean }[] = [
    { url: '/colaborador/contratos', label: 'Mis contratos', corto: 'Contratos', icon: 'file-text', exact: true },
    { url: '/colaborador/contratos/nuevo', label: 'Cargar contrato', corto: 'Cargar', icon: 'file-plus', exact: true },
    { url: '/colaborador/liquidaciones', label: 'Mis liquidaciones', corto: 'Liquidaciones', icon: 'wallet', exact: true },
    { url: '/colaborador/perfil', label: 'Mi perfil', corto: 'Perfil', icon: 'user', exact: true },
  ];

  protected salir(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
