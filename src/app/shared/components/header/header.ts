import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { Icon } from '../../icons/icon';
import { ThemeService } from '../../services/theme';
import { AuthService } from '../../../core/auth/auth.service';
import { USER_ROLE_LABEL } from '../../../core/models';

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './header.html',
})
export class Header {
  readonly sidebarToggle = output<void>();
  readonly logout = output<void>();

  protected readonly theme = inject(ThemeService);
  private readonly auth = inject(AuthService);

  protected readonly menuOpen = signal(false);

  protected readonly userName = computed(() => this.auth.user()?.nombre ?? 'Invitado');
  protected readonly userEmail = computed(() => this.auth.user()?.email ?? '');
  protected readonly userRole = computed(() => {
    const role = this.auth.role();
    return role ? USER_ROLE_LABEL[role] : '';
  });
  protected readonly initials = computed(() => {
    const name = this.auth.user()?.nombre ?? '?';
    return name
      .split(/\s+/)
      .map((part) => part.charAt(0))
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  });

  protected onLogout(): void {
    this.menuOpen.set(false);
    this.logout.emit();
  }
}
