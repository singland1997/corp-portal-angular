import { AuthUser } from '@core/auth/auth.models';
import { TranslationKey } from '@core/i18n/translation.models';

export interface NavigationItem {
  label: TranslationKey;
  path: string;
  icon: string;
  roles?: readonly AuthUser['role'][];
}

export const workspaceNavigation: NavigationItem[] = [
  { label: 'dashboard', path: '/dashboard', icon: 'pi-home' },
  { label: 'inventory', path: '/corporate', icon: 'pi-building' },
  { label: 'sim', path: '/sim', icon: 'pi-mobile' },
  { label: 'corporateQuota', path: '/corporate-quota', icon: 'pi-chart-pie' },
  { label: 'dataPool', path: '/data-pool', icon: 'pi-database' },
  { label: 'myCorporates', path: '/my-corporates', icon: 'pi-briefcase', roles: ['sales'] },
  { label: 'users', path: '/users', icon: 'pi-users', roles: ['admin'] },
  { label: 'billing', path: '/billing', icon: 'pi-receipt' },
  { label: 'reports', path: '/reports', icon: 'pi-file' },
  { label: 'roles', path: '/roles', icon: 'pi-shield', roles: ['admin'] },
];

export function canSee(item: NavigationItem, role: AuthUser['role'] | undefined): boolean {
  return !item.roles || (!!role && item.roles.includes(role));
}
