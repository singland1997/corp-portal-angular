import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthSessionStore } from './auth-session.store';
import { AuthApi } from './auth-api.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly session = inject(AuthSessionStore);
  private readonly api = inject(AuthApi);
  private readonly document = inject(DOCUMENT);
  private logoutPreference(value?: boolean): boolean {
    try {
      const storage = this.document.defaultView?.sessionStorage;
      if (value === true) storage?.setItem('corp-portal.signed-out', '1');
      if (value === false) storage?.removeItem('corp-portal.signed-out');
      return storage?.getItem('corp-portal.signed-out') === '1';
    } catch {
      return false;
    }
  }
  private restoration?: Promise<void>;
  readonly user = this.session.user;

  /** Awaited at startup, before routing. Never trust persisted user/role data. */
  restoreSession(): Promise<void> {
    return (this.restoration ??= this.restore());
  }

  private async restore(): Promise<void> {
    if (this.session.token() || this.logoutPreference()) return;
    try {
      const response = await firstValueFrom(this.api.refresh());
      if (!this.session.signingOut()) this.session.set(response);
    } catch (error) {
      this.session.renewalFailed.set(
        !(error instanceof HttpErrorResponse && [401, 403].includes(error.status)),
      );
      // Do not replay a rotating token after a failed/ambiguous refresh.
      this.session.clear();
    }
  }

  async signIn(email: string, password: string): Promise<boolean> {
    const response = await firstValueFrom(this.api.login(email, password));
    this.session.set(response);
    this.logoutPreference(false);
    return true;
  }

  async signOut(): Promise<void> {
    const token = this.session.token();
    this.session.signingOut.set(true);
    this.logoutPreference(true);
    try {
      if (token) await firstValueFrom(this.api.logout());
    } finally {
      if (this.session.token() === token) this.session.clear();
    }
  }
}
