import { Routes } from '@angular/router';

import { authGuard, guestGuard, roleGuard } from '@core/auth/auth.guard';
import { workspaceNavigation } from '@core/routing/portal-navigation';

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
    // ลิงก์ตั้งรหัสผ่านที่ admin ส่งให้ผู้ใช้ใหม่ (เปิดได้โดยไม่ต้อง login)
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
        path: 'components',
        loadComponent: () =>
          import('@features/components/components.page').then((m) => m.ComponentsPage),
      },
      {
        path: 'api-docs',
        loadComponent: () => import('@features/api-docs/api-docs.page').then((m) => m.ApiDocsPage),
      },
      {
        path: 'pooling',
        // Data pool = the bulk the corporate bought (CRM CORPORATE_QUOTA); the page lives in features/quota.
        loadComponent: () => import('@features/quota/quota.page').then((m) => m.QuotaPage),
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
        path: 'quota',
        // Corporate quota = CRM SHARE_IN_GROUP groups shared by numbers; the page lives in features/pooling.
        loadComponent: () => import('@features/pooling/pooling.page').then((m) => m.PoolingPage),
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
        path: 'sim',
        loadComponent: () => import('@features/sim/sim.page').then((m) => m.SimPage),
      },
      {
        path: 'roles',
        canActivate: [roleGuard(['admin'])],
        loadComponent: () => import('@features/roles/roles.page').then((m) => m.RolesPage),
      },
      ...workspaceNavigation
        .filter((item) => item.starter)
        .map((item) => ({
          path: item.path.slice(1),
          data: { title: item.label },
          loadComponent: () =>
            import('@features/module-starter/module-starter.page').then((m) => m.ModuleStarterPage),
        })),
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];
