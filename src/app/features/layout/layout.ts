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
        title: 'CONTROL',
        switchable: true,
        switchIcon: 'layout-dashboard',
        items: [
          { label: 'Dashboard', url: '/dashboard', icon: 'layout-dashboard' },
          { label: 'Tareas', url: '/tasks', icon: 'check-square' },
          {
            label: 'Contratos', url: '/contracts', icon: 'file-text',
            children: [
              { label: 'Listado', url: '/contracts', icon: 'file-text' },
              { label: 'Renovaciones', url: '/contracts/renovaciones', icon: 'repeat' },
              { label: 'Bajas', url: '/bajas', icon: 'trending-down' },
            ],
          },
          { label: 'Clientes', url: '/customers', icon: 'users' },
          { label: 'Suministros', url: '/supplies', icon: 'bolt' },
          { label: 'Scoring', url: '/scoring', icon: 'sparkles' },
          { label: 'Facturas Contab.', url: '/facturas-contabilidad', icon: 'receipt-x' },
          { label: 'Pagos y Liquid.', url: '/pagos-liquidacion', icon: 'wallet' },
          { label: 'Rechazos e Incid.', url: '/rechazos', icon: 'alert-triangle' },
          { label: 'Cambios', url: '/cambios', icon: 'refresh-cw' },
        ],
      },
      {
        title: 'IMPAGOS',
        switchable: true,
        switchIcon: 'alert-triangle',
        items: [
          { label: 'Dashboard', url: '/collections/dashboard', icon: 'bar-chart-2' as const },
          { label: 'Tareas del día', url: '/collections/tasks', icon: 'list-todo' as const },
          { label: 'Todos los impagos', url: '/collections/unpaid', icon: 'receipt-x' as const },
          {
            label: 'Por estado', url: '/collections/verbal-agreement', icon: 'folder-open' as const,
            children: [
              { label: 'Acuerdo Verbal', url: '/collections/verbal-agreement', icon: 'handshake' as const },
              { label: 'Aviso / Corte', url: '/collections/disconnection', icon: 'scissors' as const },
              { label: 'OVC', url: '/collections/formal-agreement', icon: 'shield' as const },
              { label: 'Pre-demanda / Demanda', url: '/collections/lawsuits', icon: 'scale' as const },
            ],
          },
          { label: 'Promesas de pago', url: '/collections/promises', icon: 'calendar-check' as const },
          { label: 'Pagos fraccionados', url: '/collections/fraccionados', icon: 'layers' as const },
          { label: 'Clientes deudores', url: '/collections/clients', icon: 'users' as const },
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
        items: [
          { label: 'Usuarios', url: '/users', icon: 'user' as const },
          ...(isAdmin ? [
            { label: 'Configuración', url: '/settings', icon: 'sliders' as const },
            { label: 'Importar datos', url: '/import', icon: 'upload' as const },
          ] : []),
        ],
      });
    }

    return base;
  });

  protected onLogout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
