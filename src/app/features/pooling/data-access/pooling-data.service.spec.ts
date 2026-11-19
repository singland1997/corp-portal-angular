import { csvCell, matchesDateRange, quotaError, DataPool, QuotaDraft } from '../pooling.models';
import { formatDataSize } from '@shared/utils/data-size';
describe('Pooling presentation and validation', () => {
  const pool: DataPool = {
    id: 'p',
    corporateId: 'A',
    name: 'Test',
    corporate: 'A',
    lot: 'L',
    status: 'active',
    service: 'DATA',
    quotaMb: 1000,
    usedMb: 900,
    remainingMb: 100,
    expiresAt: null,
    memberCount: 2,
    sourceState: 'complete',
  };
  const draft: QuotaDraft = { direction: 'decrease', amount: 1, unit: 'GB', reason: 'test' };
  it('rejects reductions beyond the latest remaining amount, inactive pools and invalid amounts', () => {
    expect(quotaError(pool, draft)).toBe('exceedsAvailable');
    expect(quotaError({ ...pool, status: 'inactive' }, draft)).toBe('inactivePool');
    for (const amount of [0, -1, NaN, Infinity])
      expect(quotaError(pool, { ...draft, amount })).toBe('invalidAmount');
    expect(quotaError(pool, { ...draft, amount: 50, unit: 'MB' })).toBeNull();
    expect(quotaError(pool, { ...draft, reason: ' ' })).toBe('reasonRequired');
  });
  it('uses MB and GB for signed transaction values in both locales', () => {
    for (const locale of ['en-US', 'th-TH']) {
      expect(formatDataSize(999, locale, 'GB')).toBe('999 MB');
      expect(formatDataSize(18400, locale, 'GB')).toBe('17.97 GB');
      expect(formatDataSize(-100000, locale, 'GB')).toBe('-97.66 GB');
      expect(formatDataSize(1000000, locale, 'GB')).toBe('976.56 GB');
    }
  });
  it('filters inclusive Bangkok calendar dates', () => {
    expect(matchesDateRange('2026-11-05T17:00:00Z', '2026-11-06', '2026-11-06')).toBe(true);
    expect(matchesDateRange('2026-11-05T16:59:59Z', '2026-11-06', '')).toBe(false);
  });
  it('escapes CSV text and neutralizes spreadsheet formulas while preserving numbers', () => {
    expect(csvCell('=1+1')).toBe('"\'=1+1"');
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell(-100)).toBe('"-100"');
  });
});
