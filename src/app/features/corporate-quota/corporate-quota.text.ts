import { computed, inject, Injectable } from '@angular/core';
import { LocaleService } from '@core/i18n/locale.service';
import { formatDataSize } from '@shared/utils/data-size';
import {
  corporateQuotaEn,
  corporateQuotaTh,
  CorporateQuotaMessageKey,
} from './corporate-quota.messages';

@Injectable()
export class CorporateQuotaText {
  private readonly i18n = inject(LocaleService);

  readonly isThai = computed(() => this.i18n.locale() === 'th');
  readonly numberLocale = computed(() => (this.isThai() ? 'th-TH' : 'en-US'));

  readonly statusOptions = computed(() =>
    (['active', 'inactive'] as const).map((value) => ({ value, label: this.t(value) })),
  );

  t(key: CorporateQuotaMessageKey): string {
    return (this.isThai() ? corporateQuotaTh : corporateQuotaEn)[key];
  }

  formatData(megabytes: number | null | undefined, maxUnit: 'GB' | 'TB' = 'TB'): string {
    return formatDataSize(megabytes, this.numberLocale(), maxUnit);
  }

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat(this.isThai() ? 'th-TH-u-ca-gregory' : 'en-GB', {
      timeZone: 'Asia/Bangkok',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  }
}
