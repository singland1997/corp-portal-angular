import { effect, inject, Injectable } from '@angular/core';
import { AuthSessionStore } from './auth-session.store';
import { AuthApi } from './auth-api.service';
import { RefreshTokenStore } from './refresh-token.store';

/** Single refresh in flight. */
@Injectable({ providedIn: 'root' })
export class SessionRefresh {
  private readonly session = inject(AuthSessionStore);
  private readonly api = inject(AuthApi);
  private readonly refreshTokens = inject(RefreshTokenStore);
  constructor() {
    effect((onCleanup) => {
      const original = this.session.session();
      if (!original || this.session.signingOut()) return;
      let subscription: { unsubscribe(): void } | undefined;
      const timer = setTimeout(
        () => {
          this.refreshTokens.clear();
          subscription = this.api.refresh(original.refreshToken).subscribe({
            next: (response) => {
              if (
                !this.session.signingOut() &&
                this.session.session()?.accessToken === original.accessToken
              ) {
                try {
                  this.session.set(response);
                } catch {
                  this.session.clear();
                }
              }
            },
            // Retrying a consumed refresh token is unsafe if its response was lost.
            error: () => {
              if (this.session.session()?.accessToken === original.accessToken)
                this.session.clear();
            },
          });
        },
        Math.max(0, original.expiresAt - Date.now() - 60_000),
      );
      onCleanup(() => {
        clearTimeout(timer);
        subscription?.unsubscribe();
      });
    });
  }
}
