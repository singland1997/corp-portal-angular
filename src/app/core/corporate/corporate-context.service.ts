import { computed, inject, Injectable, signal } from '@angular/core';
import { AuthSessionStore } from '@core/auth/auth-session.store';
import { LocaleService } from '@core/i18n/locale.service';
import { CorporateAccount } from './corporate-account';

@Injectable({ providedIn: 'root' })
export class CorporateContext {
  private readonly auth = inject(AuthSessionStore);
  private readonly i18n = inject(LocaleService);
  private readonly selection = signal<{ userId: string; corporateId: string } | null>(null);
  readonly available = computed(() => this.auth.user()?.corporates ?? []);
  readonly canSwitch = computed(
    () => this.auth.user()?.role !== 'corporate' && this.available().length > 1,
  );
  readonly current = computed<CorporateAccount | null>(() => {
    const user = this.auth.user();
    const selection = this.selection();
    return (
      this.available().find(
        (c) => selection?.userId === user?.id && c.id === selection?.corporateId,
      ) ??
      this.available()[0] ??
      null
    );
  });
  readonly name = computed(() =>
    this.i18n.locale() === 'th'
      ? (this.current()?.nameTh ?? this.current()?.name ?? '')
      : (this.current()?.name ?? ''),
  );
  readonly options = computed(() =>
    this.available().map((c) => ({
      value: c.id,
      label: this.i18n.locale() === 'th' ? (c.nameTh ?? c.name) : c.name,
    })),
  );

  select(corporateId: string): void {
    const user = this.auth.user();
    if (!user || !this.canSwitch() || !this.available().some((c) => c.id === corporateId)) return;
    this.selection.set({ userId: user.id, corporateId });
  }
}
