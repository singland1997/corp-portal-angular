import { effect, inject, Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthSessionStore } from './auth-session.store';
import { AuthApi } from './auth-api.service';

/** Single refresh in flight. */
@Injectable({ providedIn: 'root' })
export class SessionRefresh {
  private readonly session = inject(AuthSessionStore);
  private readonly api = inject(AuthApi);
  constructor() {
    effect((onCleanup) => {
      const original = this.session.session();
      if (!original || this.session.signingOut()) return;
      let subscription: { unsubscribe(): void } | undefined;
      const timer = setTimeout(
        () => {
          subscription = this.api.refresh().subscribe({
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
            error: (error) => {
              if (this.session.session()?.accessToken !== original.accessToken) return;
              if (error instanceof HttpErrorResponse && [401, 403].includes(error.status)) {
                this.session.clear();
              } else {
                // Keep the unexpired access token, but never replay an ambiguous rotation.
                this.session.renewalFailed.set(true);
              }
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
