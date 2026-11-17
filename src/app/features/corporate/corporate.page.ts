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
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { CorporateContext } from '@core/corporate/corporate-context.service';
import { LocaleService } from '@core/i18n/locale.service';
import { PORTAL_STATUSES } from '@shared/models/portal-status';
import { CardComponent } from '@shared/ui/card/card.component';
import { ConfirmDialogComponent } from '@shared/ui/confirm-dialog/confirm-dialog.component';
import { DataTableComponent } from '@shared/ui/data-table/data-table.component';
import { TableActionEvent, TableColumn } from '@shared/ui/data-table/data-table.models';
import { FeedbackStateComponent } from '@shared/ui/feedback-state/feedback-state.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/ui/status-badge/status-badge.component';
import { formatDataSize, UNKNOWN_VALUE } from '@shared/utils/data-size';
import {
  COUNTED_STATUSES,
  MobileNumber,
  matchesStatus,
  MobileNumberStatusFilter,
  NumberAction,
  summarizeLots,
  CommandResult,
} from './corporate.models';
import { CorporateDataService } from './data-access/corporate-data.service';

/** แถวในตาราง = เลขหมาย + ปริมาณใช้งานที่จัดรูปแบบแล้ว */
type NumberRow = MobileNumber & { usage: string };

/** Lot filter value for numbers whose current lot is unknown (null). */
const UNKNOWN_LOT = '__unknown__';

/**
 * หน้าข้อมูลองค์กร: โปรไฟล์, สรุปตาม lot และตารางเลขหมาย (กรอง, ดูรายละเอียด, ระงับหลายรายการ)
 */
@Component({
  selector: 'cp-corporate-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CorporateDataService],
  imports: [
    FormsModule,
    ButtonModule,
    DialogModule,
    MessageModule,
    SelectModule,
    TooltipModule,
    CardComponent,
    ConfirmDialogComponent,
    DataTableComponent,
    FeedbackStateComponent,
    PageHeaderComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './corporate.page.html',
})
export class CorporatePage {
  readonly i18n = inject(LocaleService);
  readonly corporate = inject(CorporateContext);
  readonly corporateData = inject(CorporateDataService);
  readonly table = viewChild(DataTableComponent);
  readonly unknownValue = UNKNOWN_VALUE;
  /** Number commands need the provisioning API (capabilities come from the backend). */
  readonly suspendSupported = computed(
    () => this.corporateData.resource.data()?.capabilities.suspend ?? false,
  );
  readonly resumeSupported = computed(
    () => this.corporateData.resource.data()?.capabilities.resume ?? false,
  );

  // ---- สรุป ----

  readonly counts = this.corporateData.counts;
  readonly countedStatuses = COUNTED_STATUSES;
  readonly lots = computed(() => summarizeLots(this.corporateData.numbers()));

  // ---- ตัวกรอง ----

  readonly statusFilter = signal<MobileNumberStatusFilter>('all');
  readonly lotFilter = signal<string | null>(null);

  readonly statusOptions = computed(() => [
    { label: this.i18n.t('allStatuses'), value: 'all' },
    ...PORTAL_STATUSES.map((value) => ({ label: this.i18n.t(value), value })),
    { label: this.i18n.t('unknown'), value: 'unknown' },
  ]);
  readonly lotOptions = computed(() => [
    { label: this.i18n.t('allLots'), value: null },
    ...this.lots().map(({ lot }) => ({
      label: lot ?? this.i18n.t('unknown'),
      value: lot ?? UNKNOWN_LOT,
    })),
  ]);

  // ---- ตาราง ----

  readonly rows = computed<NumberRow[]>(() =>
    this.corporateData.numbers().map((number) => ({
      ...number,
      usage: formatDataSize(number.usageMb, this.i18n.locale(), 'GB'),
    })),
  );
  readonly filteredRows = computed(() =>
    this.rows().filter(
      (row) =>
        matchesStatus(row.status, this.statusFilter()) &&
        (this.lotFilter() === null || (row.lot ?? UNKNOWN_LOT) === this.lotFilter()),
    ),
  );
  readonly columns = computed<TableColumn<NumberRow>[]>(() => [
    { field: 'mobile', header: this.i18n.t('mobile'), sortable: true },
    { field: 'lot', header: this.i18n.t('lot'), sortable: true },
    { field: 'owner', header: this.i18n.t('owner'), sortable: true },
    { field: 'package', header: this.i18n.t('package'), sortable: true },
    { field: 'usage', header: this.i18n.t('totalUsage') },
    { field: 'status', header: this.i18n.t('status'), type: 'status', sortable: true },
  ]);
  readonly actions = computed(() => [
    { id: 'details', label: this.i18n.t('details'), icon: 'pi pi-eye' },
  ]);

  // ---- การเลือกและ dialog ----

  readonly selectedNumberIds = signal<string[]>([]);
  readonly selectedNumber = signal<NumberRow | null>(null);
  /** Command waiting for confirmation (null = dialog closed). */
  readonly pendingAction = signal<NumberAction | null>(null);
  readonly confirmVisible = computed(() => this.pendingAction() !== null);
  /** Last command result summary shown above the table. */
  readonly commandSummary = signal<{ action: NumberAction; results: CommandResult[] } | null>(null);
  readonly commandMessage = computed(() => {
    const summary = this.commandSummary();
    if (!summary) return null;
    const count = (outcome: CommandResult['outcome']) =>
      summary.results.filter((r) => r.outcome === outcome).length;
    const parts = (['accepted', 'rejected', 'failed', 'unknown'] as const)
      .filter((outcome) => count(outcome) > 0)
      .map((outcome) => `${this.i18n.t(`command_${outcome}`)} ${count(outcome)}`);
    return {
      severity: count('accepted') === summary.results.length ? 'success' : 'warn',
      text: `${this.i18n.t(summary.action === 'suspend' ? 'suspend' : 'resume')}: ${parts.join(' · ')}. ${this.i18n.t('commandAfterSync')}`,
    } as const;
  });

  constructor() {
    // เปลี่ยนองค์กร → ล้างตัวกรอง การเลือก และปิด dialog
    effect(() => {
      this.corporate.current()?.id;
      untracked(() => {
        this.clearFilters();
        this.closeDetails();
        this.pendingAction.set(null);
        this.commandSummary.set(null);
        this.corporateData.mutationError.set(null);
      });
    });
  }

  // ---- ตัวกรอง (เปลี่ยนแล้วล้างรายการที่เลือกและกลับหน้าแรก) ----

  setStatusFilter(status: MobileNumberStatusFilter): void {
    this.statusFilter.set(status);
    this.selectedNumberIds.set([]);
    this.table()?.reset();
  }

  setLotFilter(lot: string | null): void {
    this.lotFilter.set(lot);
    this.selectedNumberIds.set([]);
    this.table()?.reset();
  }

  clearFilters(): void {
    this.statusFilter.set('all');
    this.lotFilter.set(null);
    this.selectedNumberIds.set([]);
    this.table()?.setSearch('');
  }

  formatDateTime(iso: string): string {
    return new Intl.DateTimeFormat(this.i18n.locale() === 'th' ? 'th-TH-u-ca-gregory' : 'en-GB', {
      timeZone: 'Asia/Bangkok',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  }

  // ---- รายละเอียดเลขหมาย ----

  openDetails(event: TableActionEvent<NumberRow>): void {
    if (event.action === 'details') this.selectedNumber.set(event.row);
  }

  closeDetails(): void {
    this.selectedNumber.set(null);
  }

  setDetailsVisible(visible: boolean): void {
    if (!visible) this.closeDetails();
  }

  // ---- ระงับ / เปิดใช้งานเลขหมาย (ผ่าน provisioning API) ----

  setConfirmVisible(visible: boolean): void {
    if (!visible) this.pendingAction.set(null);
  }

  async runPendingCommand(): Promise<void> {
    const action = this.pendingAction();
    const corporateId = this.corporate.current()?.id;
    if (!action) return;
    try {
      const results = await this.corporateData.runCommand(action, this.selectedNumberIds());
      // ผู้ใช้เปลี่ยนองค์กรระหว่างรอ → ไม่ต้องทำอะไรต่อ
      if (corporateId !== this.corporate.current()?.id) return;
      this.commandSummary.set({ action, results });
      // Keep only numbers that were not accepted, so they can be checked or retried.
      this.selectedNumberIds.set(results.filter((r) => r.outcome !== 'accepted').map((r) => r.id));
      this.pendingAction.set(null);
    } catch {
      /* เก็บรายการที่เลือกไว้ ข้อความ error จาก API แสดงเหนือตาราง */
    }
  }
}
