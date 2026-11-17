import { TranslationKey } from '@core/i18n/translation.models';

import { PortalStatus } from '@shared/models/portal-status';

/** Operation keys the UI can translate; other source actions are shown as received. */
export const KNOWN_OPERATIONS = ['simReplace', 'simActivate', 'simBar'] as const;
export type KnownOperation = Extract<TranslationKey, (typeof KNOWN_OPERATIONS)[number]>;

export interface SimActivity {
  /** The activity's own subscriber; `null` when the source cannot attribute it uniquely. */
  mobile: string | null;
  /** Known operation key or raw source action. */
  operation: string;
  /** The source has no result status; `null` = unknown. */
  status: PortalStatus | null;
  /** RFC 3339 timestamp. */
  time: string;
}

export interface DashboardSnapshot {
  updatedAt: string;
  periodStart: string;
  /** First day of `dailyUsageGb`. */
  dailyUsageFrom: string;
  numbers: { total: number; active: number; inactive: number; suspended: number };
  totalUsageTb: number | null;
  pool: { usedTb: number | null; quotaTb: number | null; unknownPools: number };
  /** `null` entries are days without source data (chart gaps). */
  dailyUsageGb: (number | null)[];
  activity: SimActivity[];
  /** `false` when part of the source activity could not be ordered and is not listed. */
  activityComplete: boolean;
}

export function isKnownOperation(value: string): value is KnownOperation {
  return (KNOWN_OPERATIONS as readonly string[]).includes(value);
}
