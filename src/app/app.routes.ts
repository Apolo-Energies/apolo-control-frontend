import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canMatch: [guestGuard],
    loadComponent: () => import('./features/auth/login').then((m) => m.Login),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/layout/layout').then((m) => m.Layout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },

      // ── Management (backend-backed) ──
      {
        path: 'customers',
        loadComponent: () => import('./features/customers/customers').then((m) => m.Customers),
      },
      {
        path: 'contracts',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/contracts/contracts').then((m) => m.Contracts),
          },
          {
            path: 'renovaciones',
            loadComponent: () =>
              import('./features/contracts/renovaciones/renovaciones').then((m) => m.Renovaciones),
          },
        ],
      },
      {
        path: 'supplies',
        loadComponent: () => import('./features/supplies/supplies').then((m) => m.Supplies),
      },
      {
        path: 'scoring',
        loadComponent: () => import('./features/scoring/scoring').then((m) => m.ScoringList),
      },
      {
        path: 'facturas-contabilidad',
        loadComponent: () =>
          import('./features/facturas-contabilidad/facturas-contabilidad').then(
            (m) => m.FacturasContabilidad,
          ),
      },
      {
        path: 'pagos-liquidacion',
        loadComponent: () =>
          import('./features/pagos-liquidacion/pagos-liquidacion').then(
            (m) => m.PagosLiquidacion,
          ),
      },
      {
        path: 'rechazos',
        loadComponent: () => import('./features/rechazos/rechazos').then((m) => m.Rechazos),
      },
      {
        path: 'bajas',
        loadComponent: () => import('./features/bajas/bajas').then((m) => m.Bajas),
      },
      {
        path: 'cambios',
        loadComponent: () => import('./features/cambios/cambios').then((m) => m.Cambios),
      },

      // ── Organization ──
      {
        path: 'branches',
        loadComponent: () => import('./features/branches/branches').then((m) => m.Branches),
      },
      {
        path: 'groups',
        loadComponent: () => import('./features/groups/groups').then((m) => m.Groups),
      },

      // ── Administration ──
      {
        path: 'users',
        data: { roles: ['admin', 'operaciones'] },
        canActivate: [authGuard],
        loadComponent: () => import('./features/users/users').then((m) => m.Users),
      },
      {
        path: 'settings',
        data: { roles: ['admin'] },
        canActivate: [authGuard],
        loadComponent: () => import('./features/settings/settings').then((m) => m.Settings),
      },
      // ── Legacy / placeholders (no backend yet) ──
      {
        path: 'tasks',
        loadComponent: () => import('./features/tasks/tasks').then((m) => m.Tasks),
      },
      {
        path: 'sales/registrations',
        loadComponent: () =>
          import('./features/sales/registrations/registrations').then((m) => m.Registrations),
      },
      {
        path: 'sales/changes',
        loadComponent: () => import('./features/sales/changes/changes').then((m) => m.Changes),
      },
      {
        path: 'sales/rejections',
        loadComponent: () =>
          import('./features/sales/rejections/rejections').then((m) => m.Rejections),
      },
      {
        path: 'sales/scoring',
        loadComponent: () => import('./features/sales/scoring/scoring').then((m) => m.Scoring),
      },
      {
        path: 'sales/cancellations',
        loadComponent: () =>
          import('./features/sales/cancellations/cancellations').then((m) => m.Cancellations),
      },
      {
        path: 'sales/multicups',
        loadComponent: () =>
          import('./features/sales/multicups/multicups').then((m) => m.Multicups),
      },
      // ── Cobros / Gestión de Impagos ──
      {
        path: 'collections/estadisticas',
        data: { roles: ['admin'] },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/collections/gestion-estadisticas/gestion-estadisticas').then(
            (m) => m.GestionEstadisticasPage,
          ),
      },
      {
        path: 'collections/dashboard',
        loadComponent: () =>
          import('./features/collections/gestion-dashboard/gestion-dashboard').then(
            (m) => m.GestionDashboard,
          ),
      },
      {
        path: 'collections/unpaid',
        loadComponent: () =>
          import('./features/collections/unpaid/unpaid').then((m) => m.Unpaid),
      },
      {
        path: 'collections/unpaid/:id',
        loadComponent: () =>
          import('./features/collections/unpaid-detail/unpaid-detail').then(
            (m) => m.UnpaidDetail,
          ),
      },
      {
        path: 'collections/verbal-agreement',
        loadComponent: () =>
          import('./features/collections/verbal-agreement/verbal-agreement').then(
            (m) => m.VerbalAgreement,
          ),
      },
      {
        path: 'collections/disconnection',
        loadComponent: () =>
          import('./features/collections/disconnection/disconnection').then(
            (m) => m.Disconnection,
          ),
      },
      {
        path: 'collections/formal-agreement',
        loadComponent: () =>
          import('./features/collections/formal-agreement/formal-agreement').then(
            (m) => m.FormalAgreement,
          ),
      },
      {
        path: 'collections/lawsuits',
        loadComponent: () =>
          import('./features/collections/lawsuits/lawsuits').then((m) => m.Lawsuits),
      },
      {
        path: 'collections/promises',
        loadComponent: () =>
          import('./features/collections/promises/promises').then((m) => m.Promises),
      },
      {
        path: 'collections/tasks',
        loadComponent: () =>
          import('./features/collections/tasks/tasks').then((m) => m.Tasks),
      },
      {
        path: 'collections/clients',
        loadComponent: () =>
          import('./features/collections/clients/clients').then((m) => m.GestionClients),
      },
      {
        path: 'finance/payments',
        loadComponent: () =>
          import('./features/finance/payments/payments').then((m) => m.Payments),
      },
      {
        path: 'finance/invoices',
        loadComponent: () =>
          import('./features/finance/invoices/invoices').then((m) => m.Invoices),
      },
      {
        path: 'import',
        loadComponent: () => import('./features/import/import').then((m) => m.Import),
      },

      {
        path: 'perfil',
        loadComponent: () => import('./features/perfil/perfil').then((m) => m.Perfil),
      },

      { path: '**', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
