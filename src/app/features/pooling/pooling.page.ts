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
import { CorporateContext } from '@core/corporate/corporate-context.service';
import { LocaleService } from '@core/i18n/locale.service';
import { CardComponent } from '@shared/ui/card/card.component';
import { ChartComponent } from '@shared/ui/chart/chart.component';
import { DataTableComponent } from '@shared/ui/data-table/data-table.component';
import { TableActionEvent, TableColumn } from '@shared/ui/data-table/data-table.models';
import { FeedbackStateComponent } from '@shared/ui/feedback-state/feedback-state.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/ui/status-badge/status-badge.component';
import { PoolingDataService } from './data-access/pooling-data.service';
import { QuotaDialogComponent } from './dialogs/quota-dialog.component';
import { PoolMessageKey } from './pooling.messages';
import { DataPool, matchesDateRange, PoolMember, QuotaDirection } from './pooling.models';
import { downloadCsv, transactionsCsv } from './pooling.export';
import { PoolingText } from './pooling.text';

/** Fixture department keys that have translations; other names are shown as stored. */
const DEPARTMENT_KEYS = ['field', 'logistics', 'sales', 'other'] as const;
/** Filter value for members without a department. */
const NO_DEPARTMENT = '__none__';
/** สีกราฟโดนัท: ใช้ไป / เหลือ / เกินโควตา */
const CHART_COLORS = ['#facc15', '#e4e4e7', '#ef4444'];

/**
 * หน้า Data Pool มี 2 โหมดตาม query `?pool=<id>`
 * - ไม่มี `pool` → รายการ pool + สรุป pool ที่เลือก
 * - มี `pool`   → รายละเอียด pool นั้น
 *
 * Dialog สร้าง/แก้ pool และปรับโควตาแยกอยู่ใน `dialogs/`
 */
@Component({
  selector: 'cp-pooling-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [PoolingDataService, PoolingText],
  imports: [
    FormsModule,
    DecimalPipe,
    ButtonModule,
    DialogModule,
    InputTextModule,
    MessageModule,
    ProgressBarModule,
    SelectModule,
    CardComponent,
    ChartComponent,
    DataTableComponent,
    FeedbackStateComponent,
    PageHeaderComponent,
    StatusBadgeComponent,
    QuotaDialogComponent,
  ],
  templateUrl: './pooling.page.html',
})
export class PoolingPage {
  readonly i18n = inject(LocaleService);
  readonly data = inject(PoolingDataService);
  readonly corporate = inject(CorporateContext);
  private readonly text = inject(PoolingText);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  // ---- pool ที่เลือก ----

  readonly detailMode = computed(() => this.params().has('pool'));
  readonly selectedPoolId = signal('');
  /** ลำดับการเลือก: `?pool=` ใน URL → pool ที่คลิก → pool แรก */
  readonly pool = computed(() => {
    const id = this.params().get('pool') ?? (this.selectedPoolId() || this.data.pools()[0]?.id);
    return this.data.pools().find((p) => p.id === id) ?? null;
  });
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
    return !!p && ((p.quotaMb ?? 0) > 0 || (p.usedMb ?? 0) > 0);
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

  // ---- ตัวกรอง ----

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
  /** Distinct department names of the selected pool's members. */
  readonly departmentNames = computed(() =>
    [
      ...new Set(
        this.members()
          .map((m) => m.department)
          .filter((d): d is string => !!d),
      ),
    ].sort(),
  );
  readonly typeOptions = computed(() => [
    { value: 'all', label: this.t('allTypes') },
    ...(['increase', 'decrease'] as const).map((value) => ({ value, label: this.t(value) })),
  ]);
  readonly poolOptions = computed(() =>
    this.data.pools().map((p) => ({ label: this.poolName(p), value: p.id })),
  );

  // ---- ข้อมูลในตาราง ----

  readonly pools = computed(() =>
    this.data
      .pools()
      .filter((p) => this.filterStatus() === 'all' || p.status === this.filterStatus())
      .map((p) => ({
        ...p,
        name: this.poolName(p),
        total: this.formatData(p.quotaMb),
        remaining: this.formatData(
          p.quotaMb !== null && p.usedMb !== null ? p.quotaMb - p.usedMb : null,
        ),
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
          (this.transactionType() === 'all' || t.type === this.transactionType()),
      );
  });
  readonly transactionRows = computed(() =>
    this.transactions().map((t) => ({
      ...t,
      date: this.text.formatDate(t.occurredAt),
      typeLabel: t.type === 'increase' || t.type === 'decrease' ? this.t(t.type) : t.type,
      afterQuantity: this.formatData(t.afterQuantityMb, 'GB'),
      amount: this.formatData(t.amountMb, 'GB'),
      total: this.formatData(t.totalAfterMb, 'GB'),
      remaining: this.formatData(t.remainingAfterMb, 'GB'),
    })),
  );

  readonly inventory = computed(
    () =>
      this.data.resource.data()?.inventory.filter((item) => item.poolId === this.pool()?.id) ?? [],
  );

  // ---- คอลัมน์และปุ่มในตาราง ----

  readonly poolColumns = computed<TableColumn<ReturnType<typeof this.pools>[number]>[]>(() => [
    { field: 'name', header: this.t('poolName'), sortable: true },
    { field: 'lot', header: this.t('lot') },
    { field: 'memberCount', header: this.t('members'), sortable: true },
    { field: 'total', header: this.t('total') },
    { field: 'remaining', header: this.t('remaining') },
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
  >(() => [
    { field: 'date', header: this.t('date') },
    { field: 'typeLabel', header: this.t('type') },
    { field: 'amount', header: this.t('change') },
    { field: 'total', header: this.t('totalAfterDisplay') },
    { field: 'remaining', header: this.t('remainingAfterDisplay') },
    ...(this.transactions().some((t) => t.afterQuantityMb != null)
      ? [{ field: 'afterQuantity' as const, header: this.t('afterQuantity') }]
      : []),
    { field: 'performedBy', header: this.t('actor') },
    { field: 'reason', header: this.t('reason') },
  ]);
  readonly inventoryColumns = computed<TableColumn<ReturnType<typeof this.inventory>[number]>[]>(
    () => [{ field: 'name', header: this.t('inventory') }],
  );
  readonly poolActions = computed(() => [
    { id: 'details', label: this.t('details'), icon: 'pi pi-eye' },
  ]);
  readonly memberActions = computed(() => [
    { id: 'details', label: this.t('details'), icon: 'pi pi-eye' },
  ]);

  // ---- กราฟ ----

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
    cutout: '72%',
    plugins: { legend: { display: false } },
  };

  // ---- dialog และข้อความแจ้ง ----

  readonly quotaVisible = signal(false);
  readonly quotaPoolId = signal('');
  readonly quotaDirection = signal<QuotaDirection>('increase');
  readonly inventoryVisible = signal(false);
  readonly member = signal<PoolMember | null>(null);
  readonly notice = signal<'saved' | 'adjusted' | null>(null);

  constructor() {
    // เปลี่ยนองค์กร → ปิด dialog และล้างตัวกรองทั้งหมด
    effect(() => {
      this.corporate.current()?.id;
      untracked(() => this.resetForCorporate());
    });
  }

  t(key: PoolMessageKey): string {
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

  // ---- การเลือกและนำทาง ----

  selectPool(id: string): void {
    this.selectedPoolId.set(id);
    this.clearTransactionFilters();
    this.department.set('all');
    this.notice.set(null);
  }

  /** ปุ่มในตาราง pool: ดูรายละเอียด (pool มาจาก CRM แก้ไขใน Portal ไม่ได้) */
  onPoolAction(event: TableActionEvent<DataPool>): void {
    this.selectPool(event.row.id);
    this.setPoolQuery(event.row.id);
  }

  back(): void {
    this.setPoolQuery(null);
  }

  // ---- dialog ----

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

  // ---- ธุรกรรม ----

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
    this.selectedPoolId.set('');
    this.quotaVisible.set(false);
    this.inventoryVisible.set(false);
    this.member.set(null);
    this.notice.set(null);
    this.filterStatus.set('all');
    this.department.set('all');
    this.clearTransactionFilters();
    this.data.mutationError.set(null);
  }
}
