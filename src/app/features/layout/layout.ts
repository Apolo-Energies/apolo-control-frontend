import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Sidebar, SidebarSection } from '../../shared/components/sidebar/sidebar';
import { Header } from '../../shared/components/header/header';
import { AuthService } from '../../core/auth/auth.service';
import { MasterDataService } from '../../core/services/master-data.service';

@Component({
  selector: 'app-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, Sidebar, Header],
  templateUrl: './layout.html',
})
export class Layout {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly masterData = inject(MasterDataService);

  protected readonly mobileOpen = signal(false);

  constructor() {
    // Fire-and-forget: fetch /v1/master-data and update IDB + signals.
    // Runs once per authenticated session load; concurrent calls collapse automatically.
    void this.masterData.refresh();
  }

  protected readonly sections = computed<SidebarSection[]>(() => {
    const isAdmin = this.auth.hasRole('admin');
    const showUsers = this.auth.hasRole('admin', 'operaciones');

    const base: SidebarSection[] = [
      {
        title: 'PRINCIPAL',
        items: [{ label: 'Dashboard', url: '/dashboard', icon: 'layout-dashboard' }],
      },
      {
        title: 'GESTIÓN',
        items: [
          { label: 'Contratos', url: '/contracts', icon: 'file-text' },
          { label: 'Clientes', url: '/customers', icon: 'users' },
          { label: 'Suministros', url: '/supplies', icon: 'bolt' },
          { label: 'Scoring', url: '/scoring', icon: 'sparkles' },
          { label: 'Facturas Contab.', url: '/facturas-contabilidad', icon: 'receipt-x' },
          { label: 'Pagos y Liquid.', url: '/pagos-liquidacion', icon: 'wallet' },
        ],
      },
      {
        title: 'ORGANIZACIÓN',
        items: [
          { label: 'Delegaciones', url: '/branches', icon: 'layers' },
          { label: 'Grupos', url: '/groups', icon: 'shield' },
        ],
      },
    ];

    if (showUsers) {
      base.push({
        title: 'ADMINISTRACIÓN',
        items: [{ label: 'Usuarios', url: '/users', icon: 'user' as const }],
      });
    }

    return base;
  });

  protected onLogout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
