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
  /** The source has no result status; always `null` (not shown). */
  status: PortalStatus | null;
  /** CRM status codes named in the activity (`PROVISIONED` → `ACTIVE`); absent in older API responses. */
  statusFrom?: string | null;
  statusTo?: string | null;
  /** RFC 3339 timestamp. */
  time: string;
}

/** Inclusive `YYYY-MM-DD` range sent as `?from&to`. */
export interface DashboardRange {
  from: string;
  to: string;
}

export const DASHBOARD_PRESETS = ['last7', 'last30', 'thisMonth', 'custom'] as const;
export type DashboardPreset = (typeof DASHBOARD_PRESETS)[number];

/** `YYYY-MM-DD` plus `days` (UTC calendar arithmetic). */
export function addDays(date: string, days: number): string {
  const time = new Date(date + 'T00:00:00Z').getTime() + days * 24 * 60 * 60 * 1000;
  return new Date(time).toISOString().slice(0, 10);
}

/**
 * The range a preset means, ending on the last synced day and never starting before the
 * synced window. `null` for `last7` (the API default) and `custom` (chosen by hand).
 */
export function presetRange(
  preset: DashboardPreset,
  availableFrom: string,
  availableTo: string,
): DashboardRange | null {
  const start =
    preset === 'last30'
      ? addDays(availableTo, -29)
      : preset === 'thisMonth'
        ? availableTo.slice(0, 8) + '01'
        : null;
  return start === null
    ? null
    : { from: start < availableFrom ? availableFrom : start, to: availableTo };
}

export interface DashboardSnapshot {
  updatedAt: string;
  /** Selected range (inclusive); the total and `dailyUsageGb` both cover it. */
  periodStart: string;
  periodEnd?: string;
  /** First day of `dailyUsageGb`. */
  dailyUsageFrom: string;
  /** Synced usage window: the range picker stays inside it. Absent in older API responses. */
  availableFrom?: string;
  availableTo?: string;
  numbers: { total: number; active: number; inactive: number; suspended: number };
  totalUsageTb: number | null;
  pool: { usedTb: number | null; quotaTb: number | null; unknownPools: number };
  /** 0 = synced day without usage; `null` = outside the synced window (chart gap). */
  dailyUsageGb: (number | null)[];
  activity: SimActivity[];
  /** `false` when part of the source activity could not be ordered and is not listed. */
  activityComplete: boolean;
}

export function isKnownOperation(value: string): value is KnownOperation {
  return (KNOWN_OPERATIONS as readonly string[]).includes(value);
}

/** CRM status code as words, e.g. `IN_USE` → "In use" (CRM terms are kept, not translated). */
export function crmStatusLabel(code: string): string {
  const words = code.toLowerCase().replaceAll('_', ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
