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
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { CorporateContext } from '@core/corporate/corporate-context.service';
import { LocaleService } from '@core/i18n/locale.service';
import { INITIAL_QUERY, pageParams, sameTableQuery } from '@core/api/pagination';
import { readResource } from '@core/api/read-resource';
import { TableQuery, TableColumn } from '@shared/ui/data-table/data-table.models';
import { DataTableComponent } from '@shared/ui/data-table/data-table.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { FeedbackStateComponent } from '@shared/ui/feedback-state/feedback-state.component';
import { featureMessages } from '@shared/utils/feature-messages';
import { BillingApi } from './data-access/billing-api';
import { Invoice } from './billing.models';
import { billingEn, billingTh } from './billing.messages';

@Component({
  selector: 'cp-billing-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    DialogModule,
    SelectModule,
    DataTableComponent,
    PageHeaderComponent,
    CardComponent,
    FeedbackStateComponent,
  ],
  templateUrl: './billing.page.html',
})
export class BillingPage {
  readonly i18n = inject(LocaleService);
  readonly t = featureMessages(billingEn, billingTh);
  private readonly context = inject(CorporateContext);
  private readonly api = inject(BillingApi);
  readonly table = viewChild(DataTableComponent);
  readonly query = signal<TableQuery>(INITIAL_QUERY, { equal: sameTableQuery });
  readonly state = signal('');
  readonly selected = signal<string | null>(null);
  readonly resource = readResource(
    () => {
      const id = this.context.current()?.id;
      return id
        ? { id, params: { ...pageParams(this.query(), 'billingCycle'), state: this.state() } }
        : null;
    },
    ({ id, params }) => this.api.page(id, params),
  );
  readonly detail = readResource(
    () => {
      const id = this.context.current()?.id,
        invoice = this.selected();
      return id && invoice ? { id, invoice } : null;
    },
    ({ id, invoice }) => this.api.detail(id, invoice),
  );
  readonly rows = computed(() => this.resource.data()?.items ?? []);
  readonly columns = computed<TableColumn<Invoice>[]>(() =>
    (
      [
        'invoiceNo',
        'billingCycle',
        'lot',
        'netAmount',
        'outstanding',
        'nextDueDate',
        'paymentStatus',
      ] as const
    ).map((field) => ({ field, header: this.t(field), sortable: field !== 'lot' })),
  );
  readonly actions = computed(() => [
    { id: 'details', label: this.i18n.t('details'), icon: 'pi pi-eye' },
  ]);
  readonly options = computed(() =>
    (['', 'unpaid', 'overdue', 'paid'] as const).map((value) => ({
      value,
      label: this.t(value || 'all'),
    })),
  );
  readonly lineHeaders = ['description', 'quantity', 'unitPrice', 'amount'] as const;
  readonly scheduleHeaders = [
    'sequenceNo',
    'dueDate',
    'amountDue',
    'amountPaid',
    'status',
  ] as const;

  constructor() {
    effect(() => {
      this.context.current()?.id;
      untracked(() => {
        this.selected.set(null);
        this.state.set('');
        this.query.set(INITIAL_QUERY);
        this.table()?.setSearch('');
      });
    });
  }

  filter(value: string): void {
    this.state.set(value);
    this.query.update((query) => ({ ...query, page: 1 }));
    this.table()?.reset();
  }

  money(value: number | null): string {
    return value === null
      ? '—'
      : new Intl.NumberFormat(this.i18n.locale(), {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value);
  }

  cell(row: Invoice, field: keyof Invoice): string {
    if (field === 'netAmount' || field === 'outstanding') return this.money(row[field]);
    return String(row[field] ?? '—');
  }
}
