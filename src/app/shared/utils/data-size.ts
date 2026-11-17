/** Placeholder for values the source does not provide. Never rendered as 0. */
export const UNKNOWN_VALUE = '—';

export function formatDataSize(
  megabytes: number | null | undefined,
  locale = 'en-US',
  maxUnit: 'GB' | 'TB' = 'TB',
): string {
  if (megabytes === null || megabytes === undefined || !Number.isFinite(megabytes))
    return UNKNOWN_VALUE;
  const absolute = Math.abs(megabytes);
  const divisor =
    maxUnit === 'TB' && absolute >= 1_000_000 ? 1_000_000 : absolute >= 1000 ? 1000 : 1;
  const unit = divisor === 1_000_000 ? 'TB' : divisor === 1000 ? 'GB' : 'MB';
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(megabytes / divisor)} ${unit}`;
}
