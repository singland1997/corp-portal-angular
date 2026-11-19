import { DecimalPipe, DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ChartData, ChartOptions } from 'chart.js';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectModule } from 'primeng/select';
import { TabsModule } from 'primeng/tabs';
import { CorporateContext } from '@core/corporate/corporate-context.service';
import { LocaleService } from '@core/i18n/locale.service';
import { CardComponent } from '@shared/ui/card/card.component';
import { ChartComponent } from '@shared/ui/chart/chart.component';
import { DataTableComponent } from '@shared/ui/data-table/data-table.component';
import { TableActionEvent, TableColumn } from '@shared/ui/data-table/data-table.models';
import { FeedbackStateComponent } from '@shared/ui/feedback-state/feedback-state.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/ui/status-badge/status-badge.component';
import { CorporateQuotaDataService } from './data-access/corporate-quota-data.service';
import { QuotaDialogComponent } from './dialogs/quota-dialog.component';
import { CorporateQuotaMessageKey } from './corporate-quota.messages';
import {
  DataPool,
  matchesDateRange,
  PoolMember,
  PoolTransaction,
  QuotaDirection,
  transactionKind,
} from './corporate-quota.models';
import { quotaActionLabel, signedAmount } from '@shared/utils/quota-history';
import { downloadCsv, transactionsCsv } from './corporate-quota.export';
import { CorporateQuotaText } from './corporate-quota.text';

const DEPARTMENT_KEYS = ['field', 'logistics', 'sales', 'other'] as const;
const NO_DEPARTMENT = '__none__';
const CHART_COLORS = ['#facc15', '#e4e4e7', '#ef4444'];

@Component({
  selector: 'cp-corporate-quota-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CorporateQuotaDataService, CorporateQuotaText],
  imports: [
    FormsModule,
    DecimalPipe,
    ButtonModule,
    DialogModule,
    InputTextModule,
    MessageModule,
    ProgressBarModule,
    SelectModule,
    TabsModule,
    CardComponent,
    ChartComponent,
    DataTableComponent,
    FeedbackStateComponent,
    PageHeaderComponent,
    StatusBadgeComponent,
    QuotaDialogComponent,
  ],
  templateUrl: './corporate-quota.page.html',
})
export class CorporateQuotaPage {
  readonly i18n = inject(LocaleService);
  readonly data = inject(CorporateQuotaDataService);
  readonly corporate = inject(CorporateContext);
  private readonly text = inject(CorporateQuotaText);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  readonly detailMode = computed(() => this.params().has('pool'));
  readonly pool = computed(
    () => this.data.pools().find((p) => p.id === this.params().get('pool')) ?? null,
  );
  /** `null` when the pool quantity is unknown (never computed as 0). */
  readonly remaining = computed(() => {
    const p = this.pool();
    return p && p.quotaMb !== null && p.usedMb !== null ? p.quotaMb - p.usedMb : null;
  });
  readonly percent = computed(() => {
    const p = this.pool();
    return p && p.quotaMb !== null && p.usedMb !== null && p.quotaMb > 0
      ? Math.round((p.usedMb / p.quotaMb) * 100)
      : null;
  });
  readonly hasQuota = computed(() => {
    const p = this.pool();
    return !!p && p.usedMb !== null && p.quotaMb !== null && (p.quotaMb > 0 || p.usedMb > 0);
  });
  readonly overQuota = computed(() => (this.remaining() ?? 0) < 0);
  /** Quota changes need the upstream command API and a known current quota. */
  readonly quotaCommandAvailable = computed(
    () => this.data.resource.data()?.capabilities.quotaAdjust ?? false,
  );
  readonly canIncrease = computed(() => {
    const p = this.pool();
    return (
      !!p && p.status === 'active' && this.quotaCommandAvailable() && this.remaining() !== null
    );
  });
  readonly canDecrease = computed(() => this.canIncrease() && (this.remaining() ?? 0) > 0);

  readonly filterStatus = signal('all');
  readonly department = signal('all');
  readonly from = signal('');
  readonly to = signal('');
  readonly transactionType = signal('all');
  readonly invalidDates = computed(() => !!this.from() && !!this.to() && this.from() > this.to());

  readonly filterOptions = computed(() => [
    { value: 'all', label: this.t('allStatuses') },
    ...this.text.statusOptions(),
  ]);
  readonly departmentOptions = computed(() => [
    { value: 'all', label: this.t('allDepartments') },
    ...this.departmentNames().map((value) => ({ value, label: this.departmentLabel(value) })),
    { value: NO_DEPARTMENT, label: this.t('unassigned') },
  ]);
  readonly departmentNames = computed(() =>
    [
      ...new Set(
        this.members()
          .map((m) => m.department)
          .filter((d): d is string => !!d),
      ),
    ].sort(),
  );
  /** The kinds of transaction this pool actually has, named for people. */
  readonly typeOptions = computed(() => [
    { value: 'all', label: this.t('allTypes') },
    ...[
      ...new Set(
        this.data
          .transactions()
          .filter((t) => t.poolId === this.pool()?.id)
          .map(transactionKind),
      ),
    ]
      .sort()
      .map((value) => ({ value, label: this.transactionLabel(value) })),
  ]);

  readonly pools = computed(() =>
    this.data
      .pools()
      .filter((p) => this.filterStatus() === 'all' || p.status === this.filterStatus())
      .map((p) => ({
        ...p,
        name: this.poolName(p),
        remainingMb: p.quotaMb !== null && p.usedMb !== null ? p.quotaMb - p.usedMb : null,
        utilization:
          p.quotaMb !== null && p.quotaMb > 0 && p.usedMb !== null
            ? (p.usedMb / p.quotaMb) * 100
            : null,
      })),
  );

  readonly members = computed(() =>
    this.data.members().filter((m) => m.poolId === this.pool()?.id),
  );
  readonly memberRows = computed(() =>
    this.members()
      .filter(
        (m) => this.department() === 'all' || (m.department ?? NO_DEPARTMENT) === this.department(),
      )
      .map((m) => ({
        ...m,
        departmentLabel: this.departmentLabel(m.department),
        dataUsed: this.formatData(m.usedMb, 'GB'),
      })),
  );
  /** ปริมาณที่ใช้แยกตามแผนก: only members with known usage; unknown usage is not 0. */
  readonly departments = computed(() =>
    this.departmentNames()
      .map((key) => ({
        key,
        label: this.departmentLabel(key),
        used: this.members()
          .filter((m) => m.department === key && m.usedMb !== null)
          .reduce((sum, m) => sum + (m.usedMb ?? 0), 0),
      }))
      .filter((d) => d.used > 0),
  );

  readonly transactions = computed(() => {
    if (this.invalidDates()) return [];
    return this.data
      .transactions()
      .filter(
        (t) =>
          t.poolId === this.pool()?.id &&
          matchesDateRange(t.occurredAt, this.from(), this.to()) &&
          (this.transactionType() === 'all' || transactionKind(t) === this.transactionType()),
      );
  });
  readonly transactionRows = computed(() =>
    this.transactions().map((t) => ({
      ...t,
      date: this.text.formatDate(t.occurredAt),
      typeLabel: this.transactionLabel(transactionKind(t)),
      member: t.mobile ?? '—',
      afterQuantity: this.formatData(t.afterQuantityMb, 'GB'),
      amount: signedAmount(t.amountMb, (mb) => this.formatData(mb, 'GB')),
      total: this.formatData(t.totalAfterMb, 'GB'),
      remaining: this.formatData(t.remainingAfterMb, 'GB'),
    })),
  );

  /** A CRM action in words; older API responses only have `increase`/`decrease`. */
  private transactionLabel(kind: string): string {
    return kind === 'increase' || kind === 'decrease'
      ? this.t(kind)
      : quotaActionLabel(kind, (key) => this.i18n.t(key));
  }

  readonly poolColumns = computed<TableColumn<ReturnType<typeof this.pools>[number]>[]>(() => [
    { field: 'name', header: this.t('poolName'), sortable: true },
    { field: 'lot', header: this.t('lot') },
    { field: 'memberCount', header: this.t('members'), sortable: true },
    { field: 'usedMb', header: this.t('used'), sortable: true },
    { field: 'remainingMb', header: this.t('remaining'), sortable: true },
    { field: 'utilization', header: this.t('utilization'), sortable: true },
    { field: 'quotaMb', header: this.t('total'), sortable: true },
    { field: 'status', header: this.t('status'), type: 'status', sortable: true },
  ]);
  readonly memberColumns = computed<TableColumn<ReturnType<typeof this.memberRows>[number]>[]>(
    () => [
      { field: 'mobile', header: this.t('mobile'), sortable: true },
      { field: 'assignedTo', header: this.t('assignedTo'), sortable: true },
      { field: 'departmentLabel', header: this.t('department') },
      { field: 'dataUsed', header: this.t('dataUsed') },
      { field: 'status', header: this.t('status'), type: 'status' },
    ],
  );
  readonly transactionColumns = computed<
    TableColumn<ReturnType<typeof this.transactionRows>[number]>[]
  >(() => {
    // Columns the CRM never fills (total/remaining after, performed by) appear only once a row
    // has a value; the raw description stays in the CSV export.
    const has = (pick: (t: PoolTransaction) => unknown) =>
      this.transactions().some((t) => pick(t) != null);
    type Column = TableColumn<ReturnType<typeof this.transactionRows>[number]>;
    return [
      { field: 'date', header: this.t('date'), width: '11rem' },
      { field: 'typeLabel', header: this.t('transactionActivity'), width: '11rem' },
      { field: 'member', header: this.t('mobile'), width: '9rem' },
      { field: 'amount', header: this.t('change'), width: '8rem', align: 'end', type: 'signed' },
      ...(has((t) => t.afterQuantityMb)
        ? [
            {
              field: 'afterQuantity',
              header: this.t('balanceAfter'),
              width: '9rem',
              align: 'end',
            } as Column,
          ]
        : []),
      ...(has((t) => t.totalAfterMb)
        ? [
            {
              field: 'total',
              header: this.t('totalAfterDisplay'),
              width: '9rem',
              align: 'end',
            } as Column,
          ]
        : []),
      ...(has((t) => t.remainingAfterMb)
        ? [
            {
              field: 'remaining',
              header: this.t('remainingAfterDisplay'),
              width: '9rem',
              align: 'end',
            } as Column,
          ]
        : []),
      ...(has((t) => t.performedBy)
        ? [{ field: 'performedBy', header: this.t('actor') } as Column]
        : []),
    ];
  });
  readonly poolActions = computed(() => [
    { id: 'details', label: this.t('details'), icon: 'pi pi-eye' },
  ]);
  readonly memberActions = computed(() => [
    { id: 'details', label: this.t('details'), icon: 'pi pi-eye' },
  ]);

  readonly chartData = computed<ChartData<'doughnut'>>(() => {
    const p = this.pool();
    const known = p && p.usedMb !== null && p.quotaMb !== null ? p : null;
    const remaining = this.remaining() ?? 0;
    const used = known ? Math.min(known.usedMb ?? 0, known.quotaMb ?? 0) : 0;
    const left = Math.max(0, remaining);
    const overage = Math.max(0, -remaining);
    return {
      labels: [this.t('used'), this.t('remaining'), this.t('overage')],
      datasets: [
        { data: known ? [used, left, overage] : [], backgroundColor: CHART_COLORS, borderWidth: 0 },
      ],
    };
  });
  readonly chartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '75%',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: (context) => context.label + ' · ' + this.formatData(context.parsed) },
      },
    },
  };

  readonly quotaVisible = signal(false);
  readonly quotaPoolId = signal('');
  readonly quotaDirection = signal<QuotaDirection>('increase');
  readonly member = signal<PoolMember | null>(null);
  readonly notice = signal<'saved' | 'adjusted' | null>(null);

  constructor() {
    effect(() => {
      this.corporate.current()?.id;
      untracked(() => this.resetForCorporate());
    });
  }

  t(key: CorporateQuotaMessageKey): string {
    return this.text.t(key);
  }

  formatData(megabytes: number | null | undefined, maxUnit: 'GB' | 'TB' = 'TB'): string {
    return this.text.formatData(megabytes, maxUnit);
  }

  /** CRM pools may have no name: show the lot, else a short form of the CRM group id. */
  poolName(pool: DataPool): string {
    return (
      pool.name ?? pool.lot ?? `${this.t('pool')} ${pool.id.split('#').pop()?.slice(0, 8) ?? ''}`
    );
  }

  formatDate(iso: string | null): string {
    return this.text.formatDate(iso);
  }

  departmentLabel(department: string | null): string {
    if (!department) return this.t('unassigned');
    return (DEPARTMENT_KEYS as readonly string[]).includes(department)
      ? this.t(department as (typeof DEPARTMENT_KEYS)[number])
      : department;
  }

  departmentShare(used: number): number {
    const total = this.pool()?.usedMb ?? null;
    return total && total > 0 ? (used / total) * 100 : 0;
  }

  onPoolAction(event: TableActionEvent<DataPool>): void {
    this.clearTransactionFilters();
    this.department.set('all');
    this.notice.set(null);
    this.setPoolQuery(event.row.id);
  }

  back(): void {
    this.setPoolQuery(null);
  }

  openQuota(direction: QuotaDirection): void {
    const pool = this.pool();
    if (!pool) return;
    this.quotaPoolId.set(pool.id);
    this.quotaDirection.set(direction);
    this.quotaVisible.set(true);
  }

  onQuotaAdjusted(): void {
    this.clearTransactionFilters();
    this.notice.set('adjusted');
  }

  clearTransactionFilters(): void {
    this.from.set('');
    this.to.set('');
    this.transactionType.set('all');
  }

  exportTransactions(): void {
    const csv = transactionsCsv(this.transactions(), this.text);
    downloadCsv(this.document, `pool-transactions-${this.pool()?.id ?? 'pool'}.csv`, csv);
  }

  private setPoolQuery(poolId: string | null): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { pool: poolId },
      queryParamsHandling: 'merge',
    });
  }

  private resetForCorporate(): void {
    this.quotaVisible.set(false);
    this.member.set(null);
    this.notice.set(null);
    this.filterStatus.set('all');
    this.department.set('all');
    this.clearTransactionFilters();
    this.data.mutationError.set(null);
  }
}
