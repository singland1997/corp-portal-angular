import { AuthUser } from '@core/auth/auth.models';
import { TranslationKey } from '@core/i18n/translation.models';

export interface NavigationItem {
  label: TranslationKey;
  path: string;
  icon: string;
  /** ยังไม่ทำ: เปิดหน้า module-starter แทน */
  starter?: boolean;
  /** แสดงเฉพาะ role เหล่านี้ (ไม่ใส่ = ทุก role) */
  roles?: readonly AuthUser['role'][];
}

export const workspaceNavigation: NavigationItem[] = [
  { label: 'dashboard', path: '/dashboard', icon: 'pi-home' },
  { label: 'inventory', path: '/corporate', icon: 'pi-building' },
  { label: 'sim', path: '/sim', icon: 'pi-mobile' },
  // { label: 'packages', path: '/packages', icon: 'pi-box', starter: true },
  // { label: 'usage', path: '/usage', icon: 'pi-chart-line', starter: true },
  { label: 'pooling', path: '/pooling', icon: 'pi-database' },
  { label: 'users', path: '/users', icon: 'pi-users', roles: ['admin'] },
  { label: 'reports', path: '/reports', icon: 'pi-file' },
  // Requires user.manage on the server (System admin only).
  { label: 'roles', path: '/roles', icon: 'pi-shield', roles: ['admin'] },
];

export const resourceNavigation: NavigationItem[] = [
  // { label: 'components', path: '/components', icon: 'pi-th-large' },
  { label: 'api', path: '/api-docs', icon: 'pi-code' },
];

export function canSee(item: NavigationItem, role: AuthUser['role'] | undefined): boolean {
  return !item.roles || (!!role && item.roles.includes(role));
}
