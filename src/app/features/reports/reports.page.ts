import { firstValueFrom } from 'rxjs';
import { INITIAL_QUERY, pageParams, sameTableQuery } from '@core/api/pagination';
import { DOCUMENT } from '@angular/common';
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
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { apiErrorMessage } from '@core/api/api-error';
import { AuthSessionStore } from '@core/auth/auth-session.store';
import { CorporateContext } from '@core/corporate/corporate-context.service';
import { LocaleService } from '@core/i18n/locale.service';
import { TranslationKey } from '@core/i18n/translation.models';
import { CardComponent } from '@shared/ui/card/card.component';
import { DataTableComponent } from '@shared/ui/data-table/data-table.component';
import { TableColumn, TableQuery } from '@shared/ui/data-table/data-table.models';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { downloadCsv, toCsv } from '@shared/utils/csv';
import { formatDataSize } from '@shared/utils/data-size';
import { featureMessages } from '@shared/utils/feature-messages';
import { ReportRow, ReportsApi } from './data-access/reports-api';
import { REPORTS, ReportColumn, ReportDefinition } from './reports.config';
import { reportsEn, ReportsMessageKey, reportsTh } from './reports.messages';

type TableRow = ReportRow & { id: string };

@Component({
  selector: 'cp-reports-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ButtonModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    CardComponent,
    DataTableComponent,
    PageHeaderComponent,
  ],
  templateUrl: './reports.page.html',
})
export class ReportsPage {
  readonly i18n = inject(LocaleService);
  readonly t = featureMessages(reportsEn, reportsTh);
  private readonly api = inject(ReportsApi);
  private readonly auth = inject(AuthSessionStore);
  private readonly corporate = inject(CorporateContext);
  private readonly document = inject(DOCUMENT);

  readonly available = computed(() => {
    const isPlatform = this.auth.user()?.role !== 'corporate';
    return REPORTS.filter((r) => r.audience === 'corporate' || isPlatform);
  });
  readonly reportOptions = computed(() =>
    (['platform', 'corporate'] as const)
      .map((audience) => ({
        label: this.t(audience === 'platform' ? 'platformGroup' : 'corporateGroup'),
        items: this.available()
          .filter((r) => r.audience === audience)
          .map((r) => ({ label: this.t(r.title), value: r.id })),
      }))
      .filter((group) => group.items.length > 0),
  );
  readonly reportId = signal(this.available()[0]?.id ?? '');
  readonly report = computed<ReportDefinition | undefined>(() =>
    REPORTS.find((r) => r.id === this.reportId()),
  );

  readonly from = signal('');
  readonly to = signal('');
  readonly invalidDates = computed(() => !!this.from() && !!this.to() && this.from() > this.to());

  readonly table = viewChild(DataTableComponent);
  readonly query = signal<TableQuery>(INITIAL_QUERY, { equal: sameTableQuery });
  readonly total = signal(0);
  readonly exporting = signal(false);
  readonly exportError = signal<TranslationKey | null>(null);
  readonly rows = signal<ReportRow[]>([]);
  readonly loading = signal(false);
  readonly error = signal<TranslationKey | null>(null);
  private readonly revision = signal(0);

  readonly tableRows = computed<TableRow[]>(() =>
    this.rows().map((row, index) => ({ ...row, id: String(index) })),
  );
  readonly columns = computed<TableColumn<TableRow>[]>(() =>
    (this.report()?.columns ?? []).map((column) => ({
      field: column.field,
      header: this.t(column.header),
      sortable: true,
    })),
  );

  constructor() {
    effect(() => {
      this.corporate.current()?.id;
      this.reportId();
      this.from();
      this.to();
      untracked(() => {
        this.query.set(INITIAL_QUERY);
        this.table()?.setSearch('');
        this.exportError.set(null);
      });
    });
    effect((onCleanup) => {
      const corporateId = this.corporate.current()?.id;
      const report = this.report();
      const from = report?.dated ? this.from() : '';
      const to = report?.dated ? this.to() : '';
      this.revision();
      const query = this.query();
      this.total.set(0);
      this.rows.set([]);
      this.error.set(null);
      this.loading.set(false);
      if (!corporateId || !report || this.invalidDates()) return;

      untracked(() => {
        this.loading.set(true);
        this.error.set(null);
      });
      const subscription = this.api
        .page(corporateId, report.id, { ...pageParams(query, report.columns[0].field), from, to })
        .subscribe({
          next: (page) => {
            this.rows.set(page.items);
            this.total.set(page.total);
            this.loading.set(false);
          },
          error: (failure) => {
            this.rows.set([]);
            this.error.set(apiErrorMessage(failure));
            this.loading.set(false);
          },
        });
      onCleanup(() => subscription.unsubscribe());
    });
  }

  selectReport(id: string): void {
    this.rows.set([]);
    this.reportId.set(id);
  }

  clearDates(): void {
    this.from.set('');
    this.to.set('');
  }

  reload(): void {
    this.revision.update((n) => n + 1);
  }

  cell(row: ReportRow, field: string): string {
    const column = this.report()?.columns.find((c) => c.field === field);
    return column ? this.format(row[field], column) : String(row[field] ?? '');
  }

  async exportCsv(): Promise<void> {
    const report = this.report(),
      corporateId = this.corporate.current()?.id;
    if (!report || !corporateId || this.exporting()) return;
    const from = report.dated ? this.from() : '',
      to = report.dated ? this.to() : '';
    const params = {
      ...pageParams(this.query(), report.columns[0].field),
      from,
      to,
      pageSize: 100,
      revision: true,
    };
    this.exporting.set(true);
    this.exportError.set(null);
    const current = () =>
      this.corporate.current()?.id === corporateId &&
      this.report() === report &&
      (!report.dated || (this.from() === from && this.to() === to));
    try {
      const rows: ReportRow[] = [];
      let revision: string | null | undefined,
        total = 0;
      for (let page = 1; ; page++) {
        const response = await firstValueFrom(
          this.api.page(corporateId, report.id, { ...params, page }),
        );
        if (!current()) return;
        if (page === 1) {
          revision = response.revision;
          total = response.total;
        }
        if (!revision || response.revision !== revision || response.total !== total) {
          this.exportError.set('dataConflict');
          return;
        }
        if (total > 100_000) {
          this.exportError.set('exportTooLarge');
          return;
        }
        rows.push(...response.items);
        if (rows.length >= total) break;
        if (response.items.length === 0) {
          this.exportError.set('dataConflict');
          return;
        }
      }
      const headings = report.columns.map((column) => this.t(column.header));
      const cells = rows.map((row) =>
        report.columns.map((column) => this.format(row[column.field], column)),
      );
      downloadCsv(this.document, report.id + '.csv', toCsv(headings, cells));
    } catch (error) {
      if (current()) this.exportError.set(apiErrorMessage(error));
    } finally {
      this.exporting.set(false);
    }
  }

  private format(value: string | number | null | undefined, column: ReportColumn): string {
    if (value === undefined || value === null || value === '') return '—';
    const thai = this.i18n.locale() === 'th';
    switch (column.format) {
      case 'number':
        return new Intl.NumberFormat(thai ? 'th-TH' : 'en-US').format(Number(value));
      case 'data':
        return formatDataSize(Number(value), thai ? 'th-TH' : 'en-US', 'TB');
      case 'date':
        return new Intl.DateTimeFormat(thai ? 'th-TH-u-ca-gregory' : 'en-GB', {
          timeZone: 'UTC',
          dateStyle: 'medium',
        }).format(new Date(`${value}T00:00:00Z`));
      case 'datetime':
        return new Intl.DateTimeFormat(thai ? 'th-TH-u-ca-gregory' : 'en-GB', {
          timeZone: 'Asia/Bangkok',
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(String(value)));
      case 'label':
        return String(value) in reportsEn ? this.t(value as ReportsMessageKey) : String(value);
      default:
        return String(value);
    }
  }
}
