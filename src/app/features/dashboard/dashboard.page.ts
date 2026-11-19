import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { RouterLink } from '@angular/router';
import { corporateResource } from '@core/api/corporate-resource';
import { LocaleService } from '@core/i18n/locale.service';
import { CardComponent } from '@shared/ui/card/card.component';
import { DialogModule } from 'primeng/dialog';
import { ChartComponent } from '@shared/ui/chart/chart.component';
import { FeedbackStateComponent } from '@shared/ui/feedback-state/feedback-state.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { formatDataSize, MB_PER_TB, UNKNOWN_VALUE } from '@shared/utils/data-size';
import { PORTAL_COLORS } from '@core/theme/portal-colors';
import { createUsageChartData, USAGE_CHART_OPTIONS } from './dashboard.charts';
import { DashboardRepository } from './data-access/dashboard.repository';
import {
  DASHBOARD_PRESETS,
  DashboardPreset,
  DashboardRange,
  DashboardSnapshot,
  isKnownOperation,
  crmStatusLabel,
  fromIsoDate,
  presetRange,
  SimActivity,
  toIsoDate,
} from './dashboard.models';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Same dates (or both null): stops a re-sent identical range from reloading again. */
function sameRange(
  a: { from: string; to: string } | null,
  b: { from: string; to: string } | null,
): boolean {
  return a === b || (!!a && !!b && a.from === b.from && a.to === b.to);
}

const PRESET_LABELS = {
  last7: 'rangeLast7Days',
  last30: 'rangeLast30Days',
  thisMonth: 'thisMonth',
  custom: 'rangeCustom',
} as const satisfies Record<DashboardPreset, string>;

@Component({
  selector: 'cp-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    CardComponent,
    ChartComponent,
    FeedbackStateComponent,
    PageHeaderComponent,
    DialogModule,
    FormsModule,
    DatePickerModule,
    SelectModule,
  ],
  templateUrl: './dashboard.page.html',
})
export class DashboardPage {
  readonly i18n = inject(LocaleService);
  private readonly repository = inject(DashboardRepository);

  readonly presets = computed(() =>
    DASHBOARD_PRESETS.map((value) => ({ value, label: this.i18n.t(PRESET_LABELS[value]) })),
  );
  readonly preset = signal<DashboardPreset>('last7');
  readonly customFrom = signal('');
  readonly customTo = signal('');
  /** Synced usage window from the last answer (bounds for the date inputs). */
  readonly window = signal<{ from: string; to: string } | null>(null, { equal: sameRange });
  /** What is sent as `?from&to`; `null` = API default (last 7 days). */
  readonly range = computed<DashboardRange | null>(
    () => {
      const preset = this.preset();
      if (preset === 'custom') {
        const from = this.customFrom();
        const to = this.customTo();
        return from && to && from <= to ? { from, to } : null;
      }
      const window = this.window();
      return window ? presetRange(preset, window.from, window.to) : null;
    },
    { equal: sameRange },
  );
  readonly customDates = computed(() =>
    this.customFrom() && this.customTo()
      ? [fromIsoDate(this.customFrom()), fromIsoDate(this.customTo())]
      : null,
  );
  readonly windowDates = computed(() => {
    const window = this.window();
    return window ? { from: fromIsoDate(window.from), to: fromIsoDate(window.to) } : null;
  });

  /** The picker emits after each click; the range is applied once both ends are chosen. */
  pickCustomDates(value: (Date | null)[] | null): void {
    const [from, to] = value ?? [];
    if (!from || !to) return;
    this.customFrom.set(toIsoDate(from));
    this.customTo.set(toIsoDate(to));
  }

  readonly resource = corporateResource((id) =>
    this.repository.load(
      id,
      untracked(() => this.range()),
    ),
  );
  readonly snapshot = this.resource.data;

  constructor() {
    // A new range reloads (the first run is the initial load). An unfinished custom
    // range keeps what is on screen instead of falling back to the default.
    let first = true;
    effect(() => {
      const range = this.range();
      const waiting = this.preset() === 'custom' && !range;
      if (first || waiting) {
        first = false;
        return;
      }
      untracked(() => this.resource.reload());
    });
    effect(() => {
      const data = this.snapshot();
      if (data?.availableFrom && data.availableTo)
        untracked(() => this.window.set({ from: data.availableFrom!, to: data.availableTo! }));
    });
  }

  /** Switching to "custom" starts from the range on screen. */
  choosePreset(preset: DashboardPreset): void {
    const data = this.snapshot();
    if (preset === 'custom' && data) {
      this.customFrom.set(data.periodStart);
      this.customTo.set(data.periodEnd ?? data.availableTo ?? '');
    }
    this.preset.set(preset);
  }

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
  /** Known days only; unknown days are never counted as 0. */
  readonly knownDays = computed(() =>
    (this.snapshot()?.dailyUsageGb ?? []).filter((n): n is number => n !== null),
  );
  readonly selected = linkedSignal<DashboardSnapshot | null | undefined, SimActivity | null>({
    source: this.snapshot,
    computation: () => null,
  });
  readonly activityColumns = [
    'mobile',
    'simOperation',
    'activityTimestamp',
    'statusChange',
    'actions',
  ] as const;
  readonly stats = computed(() => {
    const data = this.snapshot();
    if (!data) return [];
    const fmt = new Intl.NumberFormat(this.i18n.locale());
    return [
      {
        label: 'assignedLines',
        value: fmt.format(data.numbers.total),
        hint: fmt.format(data.numbers.active) + ' ' + this.i18n.t('active'),
        desktop: false,
      },
      {
        label: 'inactive',
        value: fmt.format(data.numbers.inactive),
        hint: this.i18n.t('inactiveLines'),
        desktop: true,
      },
      {
        label: 'suspended',
        value: fmt.format(data.numbers.suspended),
        hint: this.i18n.t('restrictedLines'),
        desktop: true,
      },
      {
        label: 'totalUsage',
        value: this.poolAmount(data.totalUsageTb),
        hint:
          this.i18n.t('usageInRange') +
          ' ' +
          this.periodStartLabel() +
          ' – ' +
          this.periodEndLabel(),
        desktop: false,
      },
    ] as const;
  });
  readonly percent = computed(() => {
    const p = this.poolKnown();
    return p && p.quotaTb > 0 ? Math.round((p.usedTb / p.quotaTb) * 100) : null;
  });
  /** Used beyond the quota: the ring turns red and the card says so (never just "full"). */
  readonly overQuota = computed(() => (this.percent() ?? 0) > 100);
  readonly ringFill = computed(() => {
    const percent = this.percent();
    const track = PORTAL_COLORS.ringTrack;
    if (percent === null) return track;
    const fill = this.overQuota() ? PORTAL_COLORS.critical : PORTAL_COLORS.primary;
    return `conic-gradient(${fill} ${Math.min(Math.max(percent, 0), 100)}%, ${track} 0)`;
  });
  readonly poolMetrics = computed(
    () =>
      [
        { label: 'used', value: this.snapshot()?.pool.usedTb },
        { label: 'remaining', value: this.remainingTb() },
        { label: 'allocationQuota', value: this.snapshot()?.pool.quotaTb },
      ] as const,
  );

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

  readonly dailyRange = computed(() =>
    this.dailyLabels().length ? [this.dailyLabels()[0], this.dailyLabels().at(-1)].join(' – ') : '',
  );
  /** Last day of the selected range (the total and the chart both end here). */
  readonly periodEndLabel = computed(() => this.dailyLabels().at(-1) ?? '—');
  readonly periodStartLabel = computed(() => {
    const start = this.snapshot()?.periodStart;
    return start
      ? new Intl.DateTimeFormat(this.i18n.locale(), {
          day: 'numeric',
          month: 'short',
          timeZone: 'UTC',
        }).format(new Date(start + 'T00:00:00Z'))
      : '—';
  });
  readonly chartOptions = USAGE_CHART_OPTIONS;

  readonly usageData = computed(() =>
    createUsageChartData(
      this.snapshot()?.dailyUsageGb ?? [],
      this.dailyLabels(),
      this.i18n.t('used'),
    ),
  );

  readonly usageChartLabel = computed(
    () =>
      `${this.i18n.t('dataTrend')}: ${(this.snapshot()?.dailyUsageGb ?? [])
        .map((n) => (n === null ? this.i18n.t('unknown') : `${n} GB`))
        .join(', ')}`,
  );

  /** CRM status change as "Provisioned → Active"; "—" when the activity names none. */
  statusChange(item: SimActivity): string {
    const from = item.statusFrom ?? null;
    const to = item.statusTo ?? null;
    return from && to ? `${crmStatusLabel(from)} → ${crmStatusLabel(to)}` : UNKNOWN_VALUE;
  }

  operationLabel(item: SimActivity): string {
    return isKnownOperation(item.operation) ? this.i18n.t(item.operation) : item.operation;
  }

  activityTime(time: string): string {
    return new Intl.DateTimeFormat(this.i18n.locale() === 'th' ? 'th-TH-u-ca-gregory' : 'en-GB', {
      timeZone: 'Asia/Bangkok',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(time));
  }
}
