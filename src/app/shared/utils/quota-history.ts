import { TranslationKey } from '@core/i18n/translation.models';

/** CRM quota-history actions the Portal names in words; any other action is shown as stored. */
const ACTION_LABELS: Record<string, TranslationKey> = {
  TOPUP: 'quotaActionTopup',
  REFILL: 'quotaActionRefill',
  DEDUCT: 'quotaActionDeduct',
  INITIAL: 'quotaActionInitial',
  DEACTIVATE_MEMBER: 'quotaActionMemberRemoved',
};

/** "Quota top-up" for `TOPUP`; an unknown action keeps its CRM name; missing → "—". */
export function quotaActionLabel(
  action: string | null | undefined,
  t: (key: TranslationKey) => string,
): string {
  if (!action) return '—';
  const key = ACTION_LABELS[action.trim().toUpperCase()];
  return key ? t(key) : action;
}

/** "+200 MB" / "−5 MB" / "0 MB": the direction is visible at a glance. */
export function signedAmount(value: number | null, format: (absolute: number) => string): string {
  if (value === null || !Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return sign + format(Math.abs(value));
}
