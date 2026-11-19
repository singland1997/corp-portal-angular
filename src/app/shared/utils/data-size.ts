export const UNKNOWN_VALUE = '—';
export const MB_PER_GB = 1024;
export const MB_PER_TB = MB_PER_GB * MB_PER_GB;

export function formatDataSize(
  megabytes: number | null | undefined,
  locale = 'en-US',
  maxUnit: 'GB' | 'TB' = 'TB',
): string {
  if (megabytes === null || megabytes === undefined || !Number.isFinite(megabytes))
    return UNKNOWN_VALUE;
  const absolute = Math.abs(megabytes);
  const divisor =
    maxUnit === 'TB' && absolute >= MB_PER_TB ? MB_PER_TB : absolute >= MB_PER_GB ? MB_PER_GB : 1;
  const unit = divisor === MB_PER_TB ? 'TB' : divisor === MB_PER_GB ? 'GB' : 'MB';
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(megabytes / divisor)} ${unit}`;
}
