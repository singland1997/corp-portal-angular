import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { readResource } from '@core/api/read-resource';
import { CorporateContext } from '@core/corporate/corporate-context.service';
import { LocaleService } from '@core/i18n/locale.service';
import { CardComponent } from '@shared/ui/card/card.component';
import { FeedbackStateComponent } from '@shared/ui/feedback-state/feedback-state.component';
import { MeterComponent } from '@shared/ui/meter/meter.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/ui/status-badge/status-badge.component';
import { formatDataSize, UNKNOWN_VALUE } from '@shared/utils/data-size';
import { featureMessages } from '@shared/utils/feature-messages';
import { NumberDetailApi, QuotaBalance, SubscribedPackage } from './data-access/number-detail-api';
import { numberDetailEn, numberDetailTh } from './number-detail.messages';

const DAY_MS = 86_400_000;

@Component({
  selector: 'cp-number-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ButtonModule,
    CardComponent,
    FeedbackStateComponent,
    MeterComponent,
    PageHeaderComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './number-detail.page.html',
})
export class NumberDetailPage {
  readonly i18n = inject(LocaleService);
  readonly t = featureMessages(numberDetailEn, numberDetailTh);
  readonly unknown = UNKNOWN_VALUE;
  private readonly api = inject(NumberDetailApi);
  private readonly context = inject(CorporateContext);
  private readonly numberId = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('id'))),
    { initialValue: null },
  );

  readonly detail = readResource(
    () => {
      const corporateId = this.context.current()?.id;
      const numberId = this.numberId();
      return corporateId && numberId ? { corporateId, numberId } : null;
    },
    ({ corporateId, numberId }) => this.api.get(corporateId, numberId),
  );

  /** The current MAIN package; a number without one shows its first current non-add-on. */
  readonly main = computed(() => {
    const packages = this.detail.data()?.packages ?? [];
    return (
      packages.find((p) => p.current && this.isType(p, 'MAIN')) ??
      packages.find((p) => p.current && !this.isType(p, 'ADDON')) ??
      null
    );
  });
  readonly addons = computed(() =>
    (this.detail.data()?.packages ?? [])
      .filter((p) => this.isType(p, 'ADDON'))
      .sort((a, b) => Number(b.current) - Number(a.current)),
  );

  private isType(item: SubscribedPackage, type: string): boolean {
    return item.packageType?.trim().toUpperCase() === type;
  }

  private get locale(): string {
    return this.i18n.locale() === 'th' ? 'th-TH-u-ca-gregory' : 'en-GB';
  }

  dateTime(value: string | null): string {
    return value
      ? new Intl.DateTimeFormat(this.locale, {
          timeZone: 'Asia/Bangkok',
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(value))
      : UNKNOWN_VALUE;
  }

  date(value: string | null): string {
    return value
      ? new Intl.DateTimeFormat(this.locale, {
          timeZone: 'Asia/Bangkok',
          dateStyle: 'medium',
        }).format(new Date(value))
      : UNKNOWN_VALUE;
  }

  /** Whole days until the end; unknown end or an ended package → null. */
  daysLeft(item: SubscribedPackage): number | null {
    if (!item.endDate || !item.current) return null;
    return Math.max(0, Math.ceil((new Date(item.endDate).getTime() - Date.now()) / DAY_MS));
  }

  validity(item: SubscribedPackage): string {
    if (item.validityValue === null || !item.validityUnit) return UNKNOWN_VALUE;
    const unit = item.validityUnit as 'DAY' | 'MONTH' | 'YEAR';
    return `${item.validityValue} ${this.t(unit)}`;
  }

  price(item: SubscribedPackage): string {
    if (item.priceThb === null) return UNKNOWN_VALUE;
    return new Intl.NumberFormat(this.i18n.locale(), {
      style: 'currency',
      currency: 'THB',
      maximumFractionDigits: 2,
    }).format(item.priceThb);
  }

  vat(item: SubscribedPackage): string {
    if (item.vatType === 'INCLUDED') return this.t('vatIncluded');
    if (item.vatType === 'EXCLUDED') return this.t('vatExcluded');
    return UNKNOWN_VALUE;
  }

  amount(value: number | null, unit: string | null): string {
    if (value === null) return UNKNOWN_VALUE;
    if (unit === 'MB') return formatDataSize(value, this.i18n.locale());
    return (
      new Intl.NumberFormat(this.i18n.locale(), { maximumFractionDigits: 2 }).format(value) +
      (unit ? ' ' + unit : '')
    );
  }

  used(balance: QuotaBalance): number | null {
    return balance.total === null || balance.remaining === null
      ? null
      : balance.total - balance.remaining;
  }

  count(value: number | null | undefined, unit: string | null): string {
    if (value === null || value === undefined) return UNKNOWN_VALUE;
    const text = new Intl.NumberFormat(this.i18n.locale(), { maximumFractionDigits: 1 }).format(
      value,
    );
    return unit ? `${text} ${unit}` : text;
  }

  data(value: number | null | undefined): string {
    return formatDataSize(value ?? null, this.i18n.locale(), 'GB');
  }
}
