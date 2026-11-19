import { quotaActionLabel, signedAmount } from './quota-history';

describe('quota history for people', () => {
  const t = (key: string) => `<${key}>`;

  it('names known CRM actions and keeps unknown ones as stored', () => {
    expect(quotaActionLabel('TOPUP', t)).toBe('<quotaActionTopup>');
    expect(quotaActionLabel(' deactivate_member ', t)).toBe('<quotaActionMemberRemoved>');
    expect(quotaActionLabel('SOMETHING_NEW', t)).toBe('SOMETHING_NEW');
    expect(quotaActionLabel(null, t)).toBe('—');
  });

  it('shows the direction of a change', () => {
    const mb = (value: number) => `${value} MB`;
    expect(signedAmount(200, mb)).toBe('+200 MB');
    expect(signedAmount(-5, mb)).toBe('−5 MB');
    expect(signedAmount(0, mb)).toBe('0 MB');
    expect(signedAmount(null, mb)).toBe('—');
  });
});

describe('sign colour of a change', () => {
  it('reads numbers and signed text', async () => {
    const { signTone } = await import('@shared/ui/data-table/data-table.component');
    expect(signTone(5)).toBe('positive');
    expect(signTone(-0.28)).toBe('negative');
    expect(signTone('+200 MB')).toBe('positive');
    expect(signTone('−5 MB')).toBe('negative');
    expect(signTone('0 MB')).toBeNull();
    expect(signTone(null)).toBeNull();
  });
});
