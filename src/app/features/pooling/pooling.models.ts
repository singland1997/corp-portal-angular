import { PortalStatus } from '@shared/models/portal-status';
export type PoolStatus = 'active' | 'inactive';
export type QuotaDirection = 'increase' | 'decrease';
export type DataUnit = 'MB' | 'GB';

export interface DataPool {
  id: string;
  corporateId: string;
  name: string;
  corporate: string;
  lot: string | null;
  status: PoolStatus;
  /** `null` = unknown (no verified/unit-mapped source bucket); never treated as 0. */
  quotaMb: number | null;
  usedMb: number | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  /** `unlinked` | `partial` | `complete`. */
  sourceState: string;
}
export interface PoolMember {
  id: string;
  poolId: string;
  mobile: string;
  assignedTo: string | null;
  /** Portal department name (free text) or a fixture key; `null` = not assigned. */
  department: string | null;
  usedMb: number | null;
  status: PortalStatus | null;
}
export interface PoolTransaction {
  id: string;
  poolId: string;
  /** `increase`/`decrease`, or the raw source action when the direction is unknown. */
  type: string;
  occurredAt: string | null;
  amountMb: number | null;
  totalAfterMb: number | null;
  remainingAfterMb: number | null;
  /** Source after_quantity; not confirmed as total or remaining. */
  afterQuantityMb?: number | null;
  performedBy: string | null;
  reason: string | null;
}
/** Which commands are connected (from GET /pools/capabilities). */
export interface PoolCapabilities {
  poolWrite: boolean;
  quotaAdjust: boolean;
}
export interface PoolDraft {
  name: string;
  corporate: string;
  status: PoolStatus;
}
export interface PoolInventoryItem {
  id: string;
  poolId: string;
  name: string | null;
  status?: string | null;
}
export interface QuotaDraft {
  direction: QuotaDirection;
  amount: number | null;
  unit: DataUnit;
  reason: string;
}
export type PoolError =
  | 'nameRequired'
  | 'duplicateName'
  | 'invalidCorporate'
  | 'invalidStatus'
  | 'invalidAmount'
  | 'exceedsAvailable'
  | 'reasonRequired'
  | 'poolMissing'
  | 'inactivePool'
  | 'quotaUnknown';

// Decimal conversion is a proposed UI convention pending the provider contract.
export function toMegabytes(amount: number | null, unit: DataUnit): number {
  return Math.round((amount ?? 0) * (unit === 'GB' ? 1000 : 1) * 100) / 100;
}
export function quotaError(pool: DataPool, draft: QuotaDraft): PoolError | null {
  if (pool.status !== 'active') return 'inactivePool';
  if (pool.quotaMb === null || pool.usedMb === null) return 'quotaUnknown';
  const amount = toMegabytes(draft.amount, draft.unit);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000) return 'invalidAmount';
  if (!draft.reason.trim() || draft.reason.trim().length > 200) return 'reasonRequired';
  // Conservative until overage/reduction policy is agreed. Existing negative balances remain visible.
  if (draft.direction === 'decrease' && amount > Math.max(0, pool.quotaMb - pool.usedMb))
    return 'exceedsAvailable';
  return null;
}
/** Rows without a timestamp only match when no date filter is set. */
export function matchesDateRange(iso: string | null, from: string, to: string): boolean {
  if (!iso) return !from && !to;
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
  return (!from || date >= from) && (!to || date <= to);
}
/** ย้ายไปใช้ร่วมกันที่ @shared/utils/csv แล้ว (คงไว้ให้ import เดิมใช้ได้) */
export { csvCell } from '@shared/utils/csv';
