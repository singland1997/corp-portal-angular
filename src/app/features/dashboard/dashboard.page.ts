import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { corporateResource } from '@core/api/corporate-resource';
import { CorporateContext } from '@core/corporate/corporate-context.service';
import { LocaleService } from '@core/i18n/locale.service';
import { CardComponent } from '@shared/ui/card/card.component';
import { MeterComponent } from '@shared/ui/meter/meter.component';
import { ChartComponent } from '@shared/ui/chart/chart.component';
import { FeedbackStateComponent } from '@shared/ui/feedback-state/feedback-state.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { StatCardComponent } from '@shared/ui/stat-card/stat-card.component';
import { StatusBadgeComponent } from '@shared/ui/status-badge/status-badge.component';
import { formatDataSize, MB_PER_TB } from '@shared/utils/data-size';
import { createUsageChartData, USAGE_CHART_OPTIONS } from './dashboard.charts';
import { DashboardRepository } from './data-access/dashboard.repository';
import { isKnownOperation, SimActivity } from './dashboard.models';

const DAY_MS = 24 * 60 * 60 * 1000;

/** หน้าแรกหลัง login: สรุปเลขหมาย, การใช้งานรายวัน และ data pool ขององค์กรปัจจุบัน */
@Component({
  selector: 'cp-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    CardComponent,
    ChartComponent,
    FeedbackStateComponent,
    PageHeaderComponent,
    StatCardComponent,
    StatusBadgeComponent,
    MeterComponent,
  ],
  templateUrl: './dashboard.page.html',
})
export class DashboardPage {
  readonly i18n = inject(LocaleService);
  readonly corporate = inject(CorporateContext);
  private readonly repository = inject(DashboardRepository);

  /** โหลดใหม่อัตโนมัติเมื่อเปลี่ยนองค์กร */
  readonly resource = corporateResource((id) => this.repository.load(id));
  readonly snapshot = this.resource.data;

  // ---- ตัวเลขสรุป ----

  readonly numberCounts = computed(() => ({
    total: 0,
    active: 0,
    inactive: 0,
    suspended: 0,
    ...this.snapshot()?.numbers,
  }));
  /** Pool values stay unknown (null) unless the API reports both quantities. */
  readonly poolKnown = computed(() => {
    const pool = this.snapshot()?.pool;
    return pool && pool.usedTb !== null && pool.quotaTb !== null
      ? { usedTb: pool.usedTb, quotaTb: pool.quotaTb }
      : null;
  });
  readonly remainingTb = computed(() => {
    const pool = this.poolKnown();
    return pool ? pool.quotaTb - pool.usedTb : null;
  });
  /** Pool amounts in the unit that fits (MB/GB/TB); the API reports TB. */
  poolAmount(tb: number | null | undefined): string {
    return tb === null || tb === undefined
      ? '—'
      : formatDataSize(tb * MB_PER_TB, this.i18n.locale());
  }
  readonly poolPercentage = computed(() => {
    const pool = this.poolKnown();
    return pool && pool.quotaTb > 0 ? Math.round((pool.usedTb / pool.quotaTb) * 100) : null;
  });
  /** Known days only; unknown days are never counted as 0. */
  readonly knownDays = computed(() =>
    (this.snapshot()?.dailyUsageGb ?? []).filter((n): n is number => n !== null),
  );
  readonly totalWeekUsageGb = computed(() =>
    this.knownDays().length
      ? Math.round(this.knownDays().reduce((sum, n) => sum + n, 0) * 100) / 100
      : null,
  );

  // ---- วันที่ ----

  /** วันที่ข้อมูลอัปเดตล่าสุด (`updatedAt` จาก API) ตามเวลาประเทศไทย */
  readonly updatedLabel = computed(() => {
    const updatedAt = this.snapshot()?.updatedAt;
    if (!updatedAt) return '';
    return new Intl.DateTimeFormat(this.i18n.locale() === 'th' ? 'th-TH-u-ca-gregory' : 'en-GB', {
      timeZone: 'Asia/Bangkok',
      dateStyle: 'medium',
    }).format(new Date(updatedAt));
  });

  /** ป้ายแกน x ของกราฟรายวัน นับจาก `periodStart` ทีละวัน */
  readonly dailyLabels = computed(() => {
    const snapshot = this.snapshot();
    if (!snapshot) return [];

    const start = new Date(snapshot.dailyUsageFrom + 'T00:00:00Z').getTime();
    const formatter = new Intl.DateTimeFormat(this.i18n.locale(), {
      timeZone: 'UTC',
      day: 'numeric',
      month: 'short',
    });
    return snapshot.dailyUsageGb.map((_, index) =>
      formatter.format(new Date(start + index * DAY_MS)),
    );
  });

  // ---- กราฟ ----

  readonly lineOptions = USAGE_CHART_OPTIONS;

  readonly usageData = computed(() =>
    createUsageChartData(
      this.snapshot()?.dailyUsageGb ?? [],
      this.dailyLabels(),
      this.i18n.t('used'),
    ),
  );

  /** คำอธิบายกราฟสำหรับ screen reader */
  readonly usageChartLabel = computed(
    () =>
      `${this.i18n.t('dataTrend')}: ${(this.snapshot()?.dailyUsageGb ?? [])
        .map((n) => (n === null ? this.i18n.t('unknown') : `${n} GB`))
        .join(', ')}`,
  );

  operationLabel(item: SimActivity): string {
    return isKnownOperation(item.operation) ? this.i18n.t(item.operation) : item.operation;
  }

  /** RFC 3339 → Bangkok date/time. */
  activityTime(time: string): string {
    return new Intl.DateTimeFormat(this.i18n.locale() === 'th' ? 'th-TH-u-ca-gregory' : 'en-GB', {
      timeZone: 'Asia/Bangkok',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(time));
  }
}
