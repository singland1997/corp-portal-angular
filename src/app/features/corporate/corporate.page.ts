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
import { TranslationKey } from '@core/i18n/translation.models';
import { PORTAL_STATUSES } from '@shared/models/portal-status';
import { CardComponent } from '@shared/ui/card/card.component';
import { ConfirmDialogComponent } from '@shared/ui/confirm-dialog/confirm-dialog.component';
import { DataTableComponent } from '@shared/ui/data-table/data-table.component';
import { TableActionEvent, TableColumn } from '@shared/ui/data-table/data-table.models';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/ui/status-badge/status-badge.component';
import { formatDataSize, UNKNOWN_VALUE } from '@shared/utils/data-size';
import {
  COUNTED_STATUSES,
  MobileNumber,
  MobileNumberStatusFilter,
  NumberAction,
  NumberCounts,
  CommandResult,
} from './corporate.models';
import {
  BarSegment,
  SegmentedBarComponent,
} from '@shared/ui/segmented-bar/segmented-bar.component';
import { CorporateDataService } from './data-access/corporate-data.service';
import { PackageQuota, PackagesApi } from './data-access/packages-api';
import { corporateResource } from '@core/api/corporate-resource';
import { FeedbackStateComponent } from '@shared/ui/feedback-state/feedback-state.component';

/** แถวในตาราง = เลขหมาย + ปริมาณใช้งานที่จัดรูปแบบแล้ว */
type NumberRow = MobileNumber & {
  usage: string;
  voice: string;
  smsCount: string;
  quotaText: string;
};

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
    SegmentedBarComponent,
  ],
  templateUrl: './corporate.page.html',
})
export class CorporatePage {
  readonly i18n = inject(LocaleService);
  readonly corporate = inject(CorporateContext);
  readonly corporateData = inject(CorporateDataService);
  private readonly packagesApi = inject(PackagesApi);
  /** Packages the corporate's numbers currently use (read-only). */
  readonly packages = corporateResource((id) => this.packagesApi.list(id));

  /** One line per quota: "DATA · VOLUME · 10,000 MB", "DATA · UNLIMITED". */
  packageQuotaText(quotas: readonly PackageQuota[]): string {
    if (!quotas.length) return UNKNOWN_VALUE;
    const locale = this.i18n.locale() === 'th' ? 'th-TH' : 'en-US';
    return quotas
      .map((q) => {
        const kind =
          q.quotaType === null || q.quotaType === 'unknown' ? this.i18n.t('unknown') : q.quotaType;
        const value = q.amount ?? q.rawAmount;
        const unit = q.amount !== null ? q.unit : q.rawUom;
        const amount =
          q.quotaType === 'UNLIMITED' || value === null
            ? null
            : `${value.toLocaleString(locale)}${unit ? ` ${unit}` : ''}`;
        return [q.serviceType ?? this.i18n.t('unknown'), kind, amount]
          .filter((part) => part !== null)
          .join(' · ');
      })
      .join('\n');
  }

  /** "30 days" / "30 วัน"; unknown value or unit shows "—". */
  packageValidityText(value?: number | null, unit?: string | null): string {
    const units: Record<string, [TranslationKey, TranslationKey]> = {
      DAY: ['validityDay', 'validityDays'],
      MONTH: ['validityMonth', 'validityMonths'],
      YEAR: ['validityYear', 'validityYears'],
    };
    const keys = unit ? units[unit] : undefined;
    if (!value || !keys) return UNKNOWN_VALUE;
    return `${value.toLocaleString(this.locale())} ${this.i18n.t(keys[value === 1 ? 0 : 1])}`;
  }

  /** VAT included/excluded as the CRM states it; anything else is unknown. */
  packageVatText(type?: string | null): string {
    if (type === 'INCLUDED') return this.i18n.t('vatIncluded');
    if (type === 'EXCLUDED') return this.i18n.t('vatExcluded');
    return UNKNOWN_VALUE;
  }

  /** `priceThb` is baht from the CRM (null for another currency or no price, shown as "—"). */
  packagePriceText(priceThb: number | null): string {
    return priceThb === null
      ? UNKNOWN_VALUE
      : new Intl.NumberFormat(this.i18n.locale() === 'th' ? 'th-TH' : 'en-US', {
          style: 'currency',
          currency: 'THB',
        }).format(priceThb);
  }
  readonly table = viewChild(DataTableComponent);
  readonly unknownValue = UNKNOWN_VALUE;

  readonly locale = computed(() => (this.i18n.locale() === 'th' ? 'th-TH' : 'en-US'));
  /**
   * Avatar initials: first letter of the first two words. Thai leading vowels (เ แ โ ใ ไ)
   * are skipped so "แก้ไข" gives "ก", not a lone vowel.
   */
  readonly initials = computed(() =>
    this.corporate
      .name()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => [...word].find((c) => /\p{L}/u.test(c) && !/[เ-ไ]/.test(c)))
      .filter((c): c is string => !!c)
      .join('')
      .toUpperCase(),
  );
  /** Corporate profile rows (CRM plain-text values only; unknown or blank shows "—"). */
  readonly profileFields = computed(() => {
    const account = this.corporate.current();
    const text = (value: string | null | undefined) => (value?.trim() ? value : UNKNOWN_VALUE);
    return [
      {
        key: 'contact',
        icon: 'pi-envelope',
        label: this.i18n.t('contact'),
        value: text(account?.contactEmail),
      },
      {
        key: 'contactPerson',
        icon: 'pi-user',
        label: this.i18n.t('contactPerson'),
        value: text(account?.contactName),
        sub: account?.contactTelephone?.trim() || null,
      },
      {
        key: 'telephone',
        icon: 'pi-phone',
        label: this.i18n.t('companyTelephone'),
        value: text(account?.telephone),
      },
      {
        key: 'taxId',
        icon: 'pi-id-card',
        label: this.i18n.t('taxId'),
        value: text(account?.taxId),
      },
      {
        key: 'industry',
        icon: 'pi-briefcase',
        label: this.i18n.t('industry'),
        value: this.withOther(account?.industry, account?.industryOther),
      },
      {
        key: 'legalEntityType',
        icon: 'pi-building',
        label: this.i18n.t('legalEntityType'),
        value: this.withOther(account?.legalEntityType, account?.legalEntityTypeOther),
      },
    ];
  });
  /** Numbers by status for the whole corporate (server counts, never the visible page). */
  readonly statusSegments = computed(() => this.segmentsFor(this.counts()));

  /**
   * Status parts in a fixed order with the reserved status colors; numbers whose CRM status
   * has no Portal mapping are "unknown" (striped, never folded into another status).
   */
  segmentsFor(counts: NumberCounts & { terminated?: number }): BarSegment[] {
    const terminated = counts.terminated ?? 0;
    const known = counts.active + counts.inactive + counts.suspended + terminated;
    return [
      { key: 'active', label: this.i18n.t('active'), value: counts.active, color: '#0ca30c' },
      {
        key: 'inactive',
        label: this.i18n.t('inactive'),
        value: counts.inactive,
        color: '#a1a1aa',
        ink: '#18181b',
      },
      {
        key: 'suspended',
        label: this.i18n.t('suspended'),
        value: counts.suspended,
        color: '#fab219',
        ink: '#0b0b0b',
      },
      {
        key: 'terminated',
        label: this.i18n.t('terminated'),
        value: terminated,
        color: '#d03b3b',
      },
      {
        key: 'unknown',
        label: this.i18n.t('unknown'),
        value: Math.max(0, counts.total - known),
        color: '#a1a1aa',
        pattern: true,
      },
    ];
  }

  /** CRM value plus its "other" free text, e.g. "OTHER – Cold chain"; unknown stays "—". */
  withOther(value: string | null | undefined, other: string | null | undefined): string {
    const parts = [value, other].filter((part): part is string => !!part?.trim());
    return parts.length ? parts.join(' – ') : UNKNOWN_VALUE;
  }

  /** Lot quota type label; values other than the three CRM types read as unknown. */
  lotQuotaType(type: string | null): string {
    switch (type) {
      case null:
        return UNKNOWN_VALUE;
      case 'product-quota':
        return this.i18n.t('productQuota');
      case 'share-in-group':
        return this.i18n.t('shareInGroupQuota');
      case 'corporate-quota':
        return this.i18n.t('corporateQuota');
      default:
        return this.i18n.t('unknown');
    }
  }
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
  readonly lots = this.corporateData.lots;

  // ---- ตัวกรอง ----

  readonly statusFilter = this.corporateData.status;
  readonly lotFilter = this.corporateData.lot;

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
      voice: this.countText(number.voiceMinutes, 'min'),
      smsCount: this.countText(number.sms, null),
      quotaText: this.quotaText(number),
    })),
  );

  /** Month-to-date count ("12.5 min", "3"); not mapped → "—", never 0. */
  private countText(value: number | null | undefined, unit: string | null): string {
    if (value === null || value === undefined) return UNKNOWN_VALUE;
    const text = new Intl.NumberFormat(this.i18n.locale(), { maximumFractionDigits: 1 }).format(
      value,
    );
    return unit ? `${text} ${unit}` : text;
  }

  /** "remaining / total" per balance (API order); no balances → unknown, never 0. */
  private quotaText(number: MobileNumber): string {
    const quotas = number.quotas ?? [];
    if (!quotas.length) return UNKNOWN_VALUE;
    const locale = this.i18n.locale();
    return quotas
      .map(
        (q) =>
          `${formatDataSize(q.remainingMb, locale)} / ${formatDataSize(q.totalMb, locale)}` +
          (q.capMax ? ' (Cap max)' : '') +
          (q.expiresAt ? ` · ${this.i18n.t('expires')} ${this.formatDateTime(q.expiresAt)}` : ''),
      )
      .join('\n');
  }
  readonly columns = computed<TableColumn<NumberRow>[]>(() => [
    { field: 'mobile', header: this.i18n.t('mobile'), sortable: true },
    { field: 'lot', header: this.i18n.t('lot'), sortable: true },
    { field: 'owner', header: this.i18n.t('owner'), sortable: true },
    { field: 'package', header: this.i18n.t('package'), sortable: true },
    { field: 'usage', header: this.i18n.t('dataThisMonth'), align: 'end' },
    { field: 'voice', header: this.i18n.t('voiceThisMonth'), align: 'end' },
    { field: 'smsCount', header: this.i18n.t('smsThisMonth'), align: 'end' },
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
