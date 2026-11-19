import { Routes } from '@angular/router';

import { authGuard, guestGuard, roleGuard } from '@core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('@features/auth/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('@features/auth/forgot-password/forgot-password.page').then(
        (m) => m.ForgotPasswordPage,
      ),
  },
  {
    path: 'set-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('@features/auth/set-password/set-password.page').then((m) => m.SetPasswordPage),
  },
  {
    path: '',
    canActivateChild: [authGuard],
    loadComponent: () =>
      import('@layout/app-shell/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('@features/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'corporate',
        loadComponent: () =>
          import('@features/corporate/corporate.page').then((m) => m.CorporatePage),
      },
      {
        path: 'sim',
        loadComponent: () => import('@features/sim/sim.page').then((m) => m.SimPage),
      },
      {
        path: 'corporate-quota',
        loadComponent: () =>
          import('@features/corporate-quota/corporate-quota.page').then(
            (m) => m.CorporateQuotaPage,
          ),
      },
      {
        path: 'data-pool',
        loadComponent: () =>
          import('@features/data-pool/data-pool.page').then((m) => m.DataPoolPage),
      },
      {
        path: 'my-corporates',
        canActivate: [roleGuard(['sales'])],
        loadComponent: () =>
          import('@features/my-corporates/my-corporates.page').then((m) => m.MyCorporatesPage),
      },
      {
        path: 'users',
        canActivate: [roleGuard(['admin'])],
        loadComponent: () => import('@features/users/users.page').then((m) => m.UsersPage),
      },
      {
        path: 'billing',
        loadComponent: () => import('@features/billing/billing.page').then((m) => m.BillingPage),
      },
      {
        path: 'reports',
        loadComponent: () => import('@features/reports/reports.page').then((m) => m.ReportsPage),
      },
      {
        path: 'roles',
        canActivate: [roleGuard(['admin'])],
        loadComponent: () => import('@features/roles/roles.page').then((m) => m.RolesPage),
      },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];
