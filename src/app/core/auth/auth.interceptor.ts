import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { APP_ENVIRONMENT } from '@core/config/app-environment.token';
import { AuthSessionStore } from './auth-session.store';

export function isPortalApi(requestUrl: string, apiBaseUrl: string, origin: string): boolean {
  const base = new URL(apiBaseUrl.replace(/\/$/, '') + '/', origin);
  const target = new URL(requestUrl, origin);
  return target.origin === base.origin && target.pathname.startsWith(base.pathname);
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const base = inject(APP_ENVIRONMENT).apiBaseUrl;
  const origin = inject(DOCUMENT).location.origin;
  const session = inject(AuthSessionStore);
  if (!isPortalApi(request.url, base, origin)) return next(request);
  if (new URL(request.url, origin).pathname.includes('/auth/')) {
    request = request.clone({ withCredentials: true });
  }
  const isLogin =
    request.method === 'POST' &&
    ['/auth/sessions', '/auth/sessions/refresh'].some((path) =>
      new URL(request.url, origin).pathname.endsWith(path),
    );
  const token = isLogin ? null : session.token();
  const authenticated = token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;
  return next(authenticated).pipe(
    catchError((error) => {
      // A late 401 from an old request must not sign out a new session.
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        token &&
        session.token() === token
      )
        session.clear();
      return throwError(() => error);
    }),
  );
};
