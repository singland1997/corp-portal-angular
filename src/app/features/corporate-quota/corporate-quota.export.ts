import { toCsv } from '@shared/utils/csv';
import { PoolTransaction } from './corporate-quota.models';
import { CorporateQuotaText } from './corporate-quota.text';

export { downloadCsv } from '@shared/utils/csv';

/** สร้างไฟล์ CSV ของรายการธุรกรรม */
export function transactionsCsv(transactions: PoolTransaction[], text: CorporateQuotaText): string {
  const headings = [
    text.t('date'),
    text.t('type'),
    text.t('amountMb'),
    text.t('totalAfter'),
    text.t('remainingAfter'),
    text.t('actor'),
    text.t('reason'),
  ];
  const rows = transactions.map((t) => [
    text.formatDate(t.occurredAt),
    t.type === 'increase' || t.type === 'decrease' ? text.t(t.type) : t.type,
    t.amountMb,
    t.totalAfterMb,
    t.remainingAfterMb,
    t.performedBy,
    t.reason,
  ]);
  return toCsv(headings, rows);
}
