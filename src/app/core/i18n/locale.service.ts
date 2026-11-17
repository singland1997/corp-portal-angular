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
