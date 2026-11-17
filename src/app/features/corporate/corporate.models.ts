import { PortalStatus } from '@shared/models/portal-status';

/** `unknown` = numbers whose source status has no confirmed portal mapping. */
export type MobileNumberStatusFilter = PortalStatus | 'all' | 'unknown';

/** One SIM/number. `null` means the source does not provide (or has not mapped) the value. */
export interface MobileNumber {
  id: string;
  mobile: string;
  owner: string | null;
  package: string | null;
  status: PortalStatus | null;
  usageMb: number | null;
  iccid: string | null;
  lot: string | null;
}

/** สถานะที่นับแยกในสรุป (สถานะอื่นนับรวมใน total อย่างเดียว) */
export const COUNTED_STATUSES = ['active', 'inactive', 'suspended'] as const;
type CountedStatus = (typeof COUNTED_STATUSES)[number];

export type NumberCounts = { total: number } & Record<CountedStatus, number>;

/** ข้อมูลที่ได้จาก GET /api/v1/corporates/{id} */
export interface CorporateSnapshot {
  numbers: MobileNumber[];
  counts: NumberCounts;
  /** Source freshness (RFC 3339). */
  updatedAt: string;
  /** Number commands are available only when the provisioning API is connected. */
  capabilities: { suspend: boolean; resume: boolean };
}

/** Number command sent to the provisioning API (open/close numbers). */
export type NumberAction = 'suspend' | 'resume';

/**
 * accepted = provisioning API accepted it · rejected = API refused (4xx)
 * failed = not sent · unknown = sent, no definite answer (check before retrying)
 */
export const COMMAND_OUTCOMES = ['accepted', 'rejected', 'failed', 'unknown'] as const;
export type CommandOutcome = (typeof COMMAND_OUTCOMES)[number];

export interface CommandResult {
  id: string;
  mobile: string;
  outcome: CommandOutcome;
  errorCode: string | null;
}

export interface LotSummary extends NumberCounts {
  /** `null` = numbers without a confirmed current lot. */
  lot: string | null;
}

export function emptyCounts(): NumberCounts {
  return { total: 0, active: 0, inactive: 0, suspended: 0 };
}

/** นับจำนวนเลขหมายแยกตาม lot เรียงตามชื่อ lot (lot ที่ไม่ทราบอยู่ท้ายสุด) */
export function summarizeLots(numbers: readonly MobileNumber[]): LotSummary[] {
  const lots = new Map<string | null, LotSummary>();

  for (const number of numbers) {
    const summary = lots.get(number.lot) ?? { lot: number.lot, ...emptyCounts() };
    summary.total++;
    if (number.status && (COUNTED_STATUSES as readonly string[]).includes(number.status)) {
      summary[number.status as CountedStatus]++;
    }
    lots.set(number.lot, summary);
  }

  return [...lots.values()].sort((a, b) =>
    a.lot === null ? 1 : b.lot === null ? -1 : a.lot.localeCompare(b.lot),
  );
}

/** Status filter that keeps unmapped statuses reachable instead of hiding them. */
export function matchesStatus(status: PortalStatus | null, filter: MobileNumberStatusFilter) {
  return filter === 'all' || (filter === 'unknown' ? status === null : status === filter);
}
