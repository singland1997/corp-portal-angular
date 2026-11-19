import { effect, signal, untracked } from '@angular/core';
import { Observable } from 'rxjs';
import { TranslationKey } from '@core/i18n/translation.models';
import { apiErrorMessage } from './api-error';

export function readResource<Request, Response>(
  request: () => Request | null,
  load: (request: Request) => Observable<Response>,
) {
  const data = signal<Response | null>(null);
  const loading = signal(false);
  const error = signal<TranslationKey | null>(null);
  const revision = signal(0);

  effect((onCleanup) => {
    const current = request();
    revision();
    data.set(null);
    error.set(null);
    loading.set(current !== null);
    if (current === null) return;

    const subscription = untracked(() => load(current)).subscribe({
      next: (response) => {
        data.set(response);
        loading.set(false);
      },
      error: (failure) => {
        error.set(apiErrorMessage(failure));
        loading.set(false);
      },
    });
    // Discard pending reads before showing a different organization or filter.
    onCleanup(() => subscription.unsubscribe());
  });

  return {
    data: data.asReadonly(),
    loading: loading.asReadonly(),
    error: error.asReadonly(),
    reload: () => revision.update((value) => value + 1),
  };
}
