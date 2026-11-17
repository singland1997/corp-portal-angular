import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

/** Tab-scoped persistence only; the API must validate the token before restoring a session. */
@Injectable({ providedIn: 'root' })
export class RefreshTokenStore {
  private readonly document = inject(DOCUMENT);
  private readonly key = 'corp-portal.refresh-token';

  take(): string | null {
    try {
      const storage = this.document.defaultView?.sessionStorage;
      const token = storage?.getItem(this.key);
      storage?.removeItem(this.key);
      return token && /^[0-9a-f]{64}$/.test(token) ? token : null;
    } catch {
      return null;
    }
  }

  save(token: string): void {
    try {
      this.document.defaultView?.sessionStorage.setItem(this.key, token);
    } catch {
      // Storage may be disabled; the current in-memory session remains usable.
    }
  }

  clear(): void {
    try {
      this.document.defaultView?.sessionStorage.removeItem(this.key);
    } catch {
      // Clearing the in-memory session must still work when storage is unavailable.
    }
  }
}
