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
        loadComponent: () => import('./features/contracts/contracts').then((m) => m.Contracts),
      },
      {
        path: 'supplies',
        loadComponent: () => import('./features/supplies/supplies').then((m) => m.Supplies),
      },
      {
        path: 'scoring',
        loadComponent: () => import('./features/scoring/scoring').then((m) => m.ScoringList),
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
      {
        path: 'collections/unpaid',
        loadComponent: () =>
          import('./features/collections/unpaid/unpaid').then((m) => m.Unpaid),
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

      { path: '**', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
