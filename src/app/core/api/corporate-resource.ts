import { effect, inject, signal, untracked } from '@angular/core';
import { Observable } from 'rxjs';
import { CorporateContext } from '@core/corporate/corporate-context.service';
import { TranslationKey } from '@core/i18n/translation.models';
import { apiErrorMessage } from './api-error';

/** Cancels old reads and clears old tenant data before every organization change. */
export function corporateResource<T>(load: (corporateId: string) => Observable<T>) {
  const context = inject(CorporateContext);
  const data = signal<T | null>(null);
  const loading = signal(false);
  const error = signal<TranslationKey | null>(null);
  const revision = signal(0);
  effect((onCleanup) => {
    const id = context.current()?.id;
    revision();
    data.set(null);
    error.set(null);
    loading.set(!!id);
    if (!id) return;
    const subscription = untracked(() =>
      load(id).subscribe({
        next: (value) => {
          data.set(value);
          loading.set(false);
        },
        error: (failure) => {
          error.set(apiErrorMessage(failure));
          loading.set(false);
        },
      }),
    );
    onCleanup(() => subscription.unsubscribe());
  });
  return {
    data: data.asReadonly(),
    loading: loading.asReadonly(),
    error: error.asReadonly(),
    reload: () => revision.update((value) => value + 1),
  };
}
