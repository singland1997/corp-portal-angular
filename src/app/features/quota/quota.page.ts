import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { corporateResource } from '@core/api/corporate-resource';
import { readResource } from '@core/api/read-resource';
import { INITIAL_QUERY, pageParams, sameTableQuery } from '@core/api/pagination';
import { CorporateContext } from '@core/corporate/corporate-context.service';
import { LocaleService } from '@core/i18n/locale.service';
import { CardComponent } from '@shared/ui/card/card.component';
import { DataTableComponent } from '@shared/ui/data-table/data-table.component';
import { TableColumn, TableQuery } from '@shared/ui/data-table/data-table.models';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { FeedbackStateComponent } from '@shared/ui/feedback-state/feedback-state.component';
import { MeterComponent } from '@shared/ui/meter/meter.component';
import { featureMessages } from '@shared/utils/feature-messages';
import { formatDataSize } from '@shared/utils/data-size';
import { QuotaApi, QuotaTransaction } from './data-access/quota-api';
import { quotaActionLabel, signedAmount } from '@shared/utils/quota-history';
import { quotaEn, quotaTh } from './quota.messages';

const QUOTA_COLUMN_LAYOUT: Partial<
  Record<keyof QuotaTransaction, Pick<TableColumn<QuotaTransaction>, 'width' | 'align' | 'type'>>
> = {
  occurredAt: { width: '11rem' },
  action: { width: '11rem' },
  service: { width: '7rem' },
  changeAmount: { width: '9rem', align: 'end', type: 'signed' },
  balanceAfter: { width: '10rem', align: 'end' },
};
@Component({
  selector: 'cp-quota-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    InputTextModule,
    MessageModule,
    CardComponent,
    DataTableComponent,
    PageHeaderComponent,
    FeedbackStateComponent,
    MeterComponent,
  ],
  templateUrl: './quota.page.html',
})
export class QuotaPage {
  readonly i18n = inject(LocaleService);
  readonly t = featureMessages(quotaEn, quotaTh);
  private readonly context = inject(CorporateContext);
  private readonly api = inject(QuotaApi);
  readonly table = viewChild(DataTableComponent);
  readonly from = signal('');
  readonly to = signal('');
  readonly query = signal<TableQuery>(INITIAL_QUERY, { equal: sameTableQuery });
  readonly invalidDates = computed(() => !!this.from() && !!this.to() && this.from() > this.to());
  readonly summary = corporateResource((id) => this.api.summary(id));
  readonly history = readResource(
    () => {
      const id = this.context.current()?.id;
      return id && !this.invalidDates()
        ? {
            id,
            params: {
              ...pageParams(this.query(), 'occurredAt'),
              from: this.from(),
              to: this.to(),
            },
          }
        : null;
    },
    ({ id, params }) => this.api.history(id, params),
  );
  readonly rows = computed(() => this.history.data()?.items ?? []);
  readonly columns = computed<TableColumn<QuotaTransaction>[]>(() =>
    (
      ['occurredAt', 'action', 'service', 'changeAmount', 'balanceAfter', 'description'] as const
    ).map((field) => ({
      field,
      header: this.t(field),
      sortable: field !== 'description',
      // Same widths on every page; the description takes what is left.
      ...QUOTA_COLUMN_LAYOUT[field],
    })),
  );
  readonly quantities = ['total', 'used', 'remaining'] as const;

  constructor() {
    effect(() => {
      this.context.current()?.id;
      untracked(() => {
        this.from.set('');
        this.to.set('');
        this.table()?.setSearch('');
      });
    });
    effect(() => {
      this.from();
      this.to();
      untracked(() => {
        this.query.update((query) => ({ ...query, page: 1 }));
        this.table()?.reset();
      });
    });
  }

  amount(value: number | null, unit: string | null): string {
    if (value === null) return '—';
    if (unit === 'MB') return formatDataSize(value, this.i18n.locale());
    return (
      new Intl.NumberFormat(this.i18n.locale(), { maximumFractionDigits: 2 }).format(value) +
      (unit ? ' ' + unit : '')
    );
  }

  date(value: string | null): string {
    return value
      ? new Intl.DateTimeFormat(this.i18n.locale() === 'th' ? 'th-TH-u-ca-gregory' : 'en-GB', {
          timeZone: 'Asia/Bangkok',
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(value))
      : '—';
  }

  cell(row: QuotaTransaction, field: keyof QuotaTransaction): string {
    if (field === 'changeAmount')
      return signedAmount(row.changeAmount, (value) => this.amount(value, row.unit));
    if (field === 'balanceAfter') return this.amount(row[field], row.unit);
    if (field === 'action') return quotaActionLabel(row.action, (key) => this.i18n.t(key));
    if (field === 'occurredAt') return this.date(row[field]);
    return row[field] ?? '—';
  }
}
