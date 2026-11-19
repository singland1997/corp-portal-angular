import { inject } from '@angular/core';
import { LocaleService } from '@core/i18n/locale.service';

export function featureMessages<T extends Record<string, string>>(
  en: T,
  th: Record<keyof T, string>,
): (key: keyof T) => string {
  const i18n = inject(LocaleService);
  return (key) => (i18n.locale() === 'th' ? th : en)[key];
}
