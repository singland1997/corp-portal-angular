import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
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
import { TableColumn } from '@shared/ui/data-table/data-table.models';
import { FeedbackStateComponent } from '@shared/ui/feedback-state/feedback-state.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { downloadCsv, toCsv } from '@shared/utils/csv';
import { formatDataSize } from '@shared/utils/data-size';
import { featureMessages } from '@shared/utils/feature-messages';
import { ReportRow, ReportsApi } from './data-access/reports-api';
import { REPORTS, ReportColumn, ReportDefinition } from './reports.config';
import { reportsEn, ReportsMessageKey, reportsTh } from './reports.messages';

/** แถวในตาราง (ตารางกลางต้องมี id) */
type TableRow = ReportRow & { id: string };

/**
 * หน้ารายงาน: เลือกรายงาน → กรองช่วงวันที่ → ดูตาราง → ส่งออก CSV
 *
 * - ผู้ใช้ platform (System admin / Sales) เห็นรายงานทั้ง 2 กลุ่ม
 * - ผู้ใช้ corporate เห็นเฉพาะรายงานขององค์กรตัวเอง
 * รายการรายงานและคอลัมน์ทั้งหมดอยู่ใน `reports.config.ts`
 */
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
    FeedbackStateComponent,
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

  // ---- รายงานที่เลือกได้ ----

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

  // ---- ช่วงวันที่ ----

  readonly from = signal('');
  readonly to = signal('');
  readonly invalidDates = computed(() => !!this.from() && !!this.to() && this.from() > this.to());

  // ---- ข้อมูล ----

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
    // โหลดใหม่เมื่อเปลี่ยนองค์กร รายงาน หรือช่วงวันที่ (ยกเลิก request เก่าอัตโนมัติ)
    effect((onCleanup) => {
      const corporateId = this.corporate.current()?.id;
      const report = this.report();
      const from = report?.dated ? this.from() : '';
      const to = report?.dated ? this.to() : '';
      this.revision();
      this.rows.set([]);
      this.error.set(null);
      this.loading.set(false);
      if (!corporateId || !report || this.invalidDates()) return;

      untracked(() => {
        this.loading.set(true);
        this.error.set(null);
      });
      const subscription = this.api.rows(corporateId, report.id, from, to).subscribe({
        next: (rows) => {
          this.rows.set(rows);
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

  /** ค่าที่แสดงในช่อง ตามรูปแบบที่กำหนดใน reports.config.ts */
  cell(row: ReportRow, field: string): string {
    const column = this.report()?.columns.find((c) => c.field === field);
    return column ? this.format(row[field], column) : String(row[field] ?? '');
  }

  exportCsv(): void {
    const report = this.report();
    if (!report) return;
    const headings = report.columns.map((c) => this.t(c.header));
    const rows = this.rows().map((row) => report.columns.map((c) => this.format(row[c.field], c)));
    const range = report.dated && (this.from() || this.to()) ? `-${this.from()}_${this.to()}` : '';
    downloadCsv(this.document, `${report.id}${range}.csv`, toCsv(headings, rows));
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
