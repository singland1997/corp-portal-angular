import { DOCUMENT } from '@angular/common';
import { effect, inject, Injectable, signal } from '@angular/core';

import { PrimeNG } from 'primeng/config';

import { Locale, TranslationKey } from './translation.models';
import { en } from './locales/en';
import { th } from './locales/th';

const LOCALE_STORAGE_KEY = 'corp-portal.locale';

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly document = inject(DOCUMENT);
  private readonly prime = inject(PrimeNG);
  private readonly currentLocale = signal<Locale>(this.readLocale());
  readonly locale = this.currentLocale.asReadonly();

  constructor() {
    effect(() => {
      const locale = this.locale();
      this.document.documentElement.lang = locale;
      this.prime.setTranslation({
        emptyMessage: this.t('empty'),
        emptyFilterMessage: this.t('empty'),
        accept: this.t('confirm'),
        reject: this.t('cancel'),
        ...calendarNames(locale),
        aria: {
          firstPageLabel: this.t('firstPage'),
          lastPageLabel: this.t('lastPage'),
          nextPageLabel: this.t('nextPage'),
          previousPageLabel: this.t('previousPage'),
          rowsPerPageLabel: this.t('rowsPerPage'),
          pageLabel: this.t('pageOf'),
        },
      });
      try {
        this.document.defaultView?.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      } catch {
        /* Storage can be disabled. */
      }
    });
  }

  t(key: TranslationKey): string {
    return (this.locale() === 'th' ? th : en)[key];
  }

  setLocale(value: Locale): void {
    this.currentLocale.set(value);
  }

  private readLocale(): Locale {
    try {
      return this.document.defaultView?.localStorage.getItem(LOCALE_STORAGE_KEY) === 'th'
        ? 'th'
        : 'en';
    } catch {
      return 'en';
    }
  }
}

/** Month and day names for PrimeNG's date picker, from the browser (Gregorian in Thai too). */
function calendarNames(locale: Locale) {
  const tag = locale === 'th' ? 'th-TH-u-ca-gregory' : 'en-US';
  const names = (options: Intl.DateTimeFormatOptions, dates: Date[]) =>
    dates.map((date) => new Intl.DateTimeFormat(tag, { ...options, timeZone: 'UTC' }).format(date));
  // 2023-01-01 was a Sunday: 7 days from there, 12 months of 2023.
  const days = Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(2023, 0, 1 + i)));
  const months = Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(2023, i, 1)));
  return {
    dayNames: names({ weekday: 'long' }, days),
    dayNamesShort: names({ weekday: 'short' }, days),
    dayNamesMin: names({ weekday: 'narrow' }, days),
    monthNames: names({ month: 'long' }, months),
    monthNamesShort: names({ month: 'short' }, months),
    firstDayOfWeek: 0,
  };
}
