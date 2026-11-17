import { REPORTS } from './reports.config';

describe('REPORTS', () => {
  it('matches the report ids served by the reporting API', () => {
    // ต้องตรงกับ ReportKind::parse ใน corp-portal-api/services/reporting/src/features/reports/model.rs
    expect(REPORTS.map((r) => r.id)).toEqual([
      'package-status',
      'sim-status',
      'user-activity',
      'usage-summary',
      'usage-detail',
      'sim-activity',
      'packages',
    ]);
  });

  it('keeps system admin reports separate from corporate reports', () => {
    const platform = REPORTS.filter((r) => r.audience === 'platform').map((r) => r.id);
    expect(platform).toEqual(['package-status', 'sim-status', 'user-activity']);
  });
});
