import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthSessionStore } from './auth-session.store';
import { AuthApi } from './auth-api.service';
import { RefreshTokenStore } from './refresh-token.store';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly session = inject(AuthSessionStore);
  private readonly api = inject(AuthApi);
  private readonly refreshTokens = inject(RefreshTokenStore);
  private restoration?: Promise<void>;
  readonly user = this.session.user;

  /** Awaited at startup, before routing. Never trust persisted user/role data. */
  restoreSession(): Promise<void> {
    return (this.restoration ??= this.restore());
  }

  private async restore(): Promise<void> {
    if (this.session.token()) return;
    const token = this.refreshTokens.take();
    if (!token) return;
    try {
      const response = await firstValueFrom(this.api.refresh(token));
      if (!this.session.signingOut()) this.session.set(response);
    } catch {
      // Do not replay a rotating token after a failed/ambiguous refresh.
      this.session.clear();
    }
  }

  async signIn(email: string, password: string): Promise<boolean> {
    const response = await firstValueFrom(this.api.login(email, password));
    this.session.set(response);
    return true;
  }

  async signOut(): Promise<void> {
    const token = this.session.token();
    this.session.signingOut.set(true);
    this.refreshTokens.clear();
    try {
      if (token) await firstValueFrom(this.api.logout());
    } finally {
      if (this.session.token() === token) this.session.clear();
    }
  }
}
