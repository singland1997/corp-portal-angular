import { addDays, crmStatusLabel, fromIsoDate, presetRange, toIsoDate } from './dashboard.models';

describe('dashboard date range presets', () => {
  it('end on the last synced day and stay inside the synced window', () => {
    expect(addDays('2026-11-19', -29)).toBe('2026-10-21');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(presetRange('last30', '2026-08-21', '2026-11-19')).toEqual({
      from: '2026-10-21',
      to: '2026-11-19',
    });
    expect(presetRange('thisMonth', '2026-08-21', '2026-11-19')).toEqual({
      from: '2026-11-01',
      to: '2026-11-19',
    });
    // The month started before the synced window: clipped to the window start.
    expect(presetRange('thisMonth', '2026-11-05', '2026-11-19')).toEqual({
      from: '2026-11-05',
      to: '2026-11-19',
    });
    // Last 7 days is the API default; custom is chosen by hand.
    expect(presetRange('last7', '2026-08-21', '2026-11-19')).toBeNull();
    expect(presetRange('custom', '2026-08-21', '2026-11-19')).toBeNull();
  });
});

describe('CRM status labels', () => {
  it('turn CRM codes into words without inventing meaning', () => {
    expect(crmStatusLabel('PROVISIONED')).toBe('Provisioned');
    expect(crmStatusLabel('IN_USE')).toBe('In use');
  });
});

describe('date picker conversion', () => {
  it('round-trips local dates without a time-zone shift', () => {
    expect(toIsoDate(fromIsoDate('2026-11-19'))).toBe('2026-11-19');
    expect(fromIsoDate('2026-09-01').getDate()).toBe(1);
  });
});
