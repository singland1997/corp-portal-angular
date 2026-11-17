import { effect, inject, Injectable } from '@angular/core';
import { AuthSessionStore } from '@core/auth/auth-session.store';

/** Keep the same key after an ambiguous timeout. Never persist payloads or credentials. */
@Injectable({ providedIn: 'root' })
export class MutationKeys {
  private readonly session = inject(AuthSessionStore);
  private readonly pending = new Map<string, string>();
  private owner: string | null = null;
  constructor() {
    effect(() => {
      this.selectOwner();
    });
  }
  acquire(method: string, path: string, corporateId: string, body: unknown) {
    this.selectOwner();
    const scope = JSON.stringify([this.session.user()?.id, corporateId, method, path, body]);
    let key = this.pending.get(scope);
    if (!key) {
      if (this.pending.size >= 100)
        throw new Error('Resolve pending operations before submitting more');
      key = crypto.randomUUID();
      this.pending.set(scope, key);
    }
    return {
      key,
      complete: () => {
        if (this.pending.get(scope) === key) this.pending.delete(scope);
      },
    };
  }
  private selectOwner(): void {
    const owner = this.session.user()?.id ?? null;
    if (owner !== this.owner) {
      this.pending.clear();
      this.owner = owner;
    }
  }
}
