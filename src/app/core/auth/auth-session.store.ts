import { DOCUMENT } from '@angular/common';
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { AuthSession, LoginResponse } from './auth.models';
import { ApiResponseError } from '@core/api/api-response.error';
import { RefreshTokenStore } from './refresh-token.store';

/** Access tokens stay in memory; only the rotating refresh token survives a reload. */
@Injectable({ providedIn: 'root' })
export class AuthSessionStore {
  private readonly refreshTokens = inject(RefreshTokenStore);
  private readonly state = signal<AuthSession | null>(null);
  private expiryTimer?: ReturnType<typeof setTimeout>;
  readonly signingOut = signal(false);
  readonly renewalFailed = signal(false);
  readonly session = this.state.asReadonly();
  readonly user = computed(() => this.state()?.user ?? null);

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.expiryTimer));
    // Remove the old frontend-only login marker during migration.
    try {
      inject(DOCUMENT).defaultView?.sessionStorage.removeItem('corp-portal.session');
    } catch {
      /* Storage can be disabled. */
    }
  }

  set(response: LoginResponse): void {
    if (
      !response ||
      response.tokenType !== 'Bearer' ||
      !response.accessToken ||
      typeof response.refreshToken !== 'string' ||
      !/^[0-9a-f]{64}$/.test(response.refreshToken) ||
      !Number.isFinite(response.expiresIn) ||
      response.expiresIn <= 0 ||
      response.expiresIn > 86400 ||
      !response.user?.corporates?.length ||
      !['admin', 'corporate', 'sales'].includes(response.user.role) ||
      // ผู้ใช้ corporate มี 1 องค์กร ส่วนผู้ใช้ platform (admin/sales) มีได้หลายองค์กร
      (response.user.role === 'corporate' && response.user.corporates.length !== 1)
    ) {
      throw new ApiResponseError('Invalid authentication response');
    }
    clearTimeout(this.expiryTimer);
    this.signingOut.set(false);
    this.renewalFailed.set(false);
    this.state.set({ ...response, expiresAt: Date.now() + response.expiresIn * 1000 });
    this.refreshTokens.save(response.refreshToken);
    this.expiryTimer = setTimeout(() => this.clear(), response.expiresIn * 1000);
  }

  token(): string | null {
    const session = this.state();
    if (session && session.expiresAt <= Date.now()) {
      this.clear();
      return null;
    }
    return session?.accessToken ?? null;
  }

  clear(): void {
    clearTimeout(this.expiryTimer);
    this.refreshTokens.clear();
    this.state.set(null);
  }
}
