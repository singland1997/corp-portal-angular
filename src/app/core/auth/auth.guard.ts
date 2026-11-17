import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';

import { AuthUser } from './auth.models';
import { AuthSessionStore } from './auth-session.store';

export const authGuard: CanActivateChildFn = () => {
  const session = inject(AuthSessionStore);
  const router = inject(Router);
  if (!session.token()) return router.createUrlTree(['/login']);
  return true;
};

/** เปิดหน้าได้เฉพาะ role ที่กำหนด ไม่งั้นกลับหน้า Dashboard (API ก็ตรวจสิทธิ์ซ้ำอีกชั้น) */
export function roleGuard(roles: readonly AuthUser['role'][]): CanActivateFn {
  return () => {
    const role = inject(AuthSessionStore).user()?.role;
    return (!!role && roles.includes(role)) || inject(Router).parseUrl('/dashboard');
  };
}

export const guestGuard: CanActivateFn = () => {
  const session = inject(AuthSessionStore);
  const router = inject(Router);
  if (!session.token()) return true;
  return router.parseUrl('/dashboard');
};
