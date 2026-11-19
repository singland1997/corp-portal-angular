import { NumberPage, MobileNumber } from '../app/features/corporate/corporate.models';
export function testNumberPage(items: MobileNumber[] = []): NumberPage {
  return {
    items,
    total: items.length,
    page: 1,
    pageSize: 10,
    counts: { total: 35, active: 30, inactive: 2, suspended: 3 },
    lots: [
      {
        lot: 'LOT-A',
        productName: 'Business Connect',
        quotaType: 'share-in-group',
        counts: { total: 35, active: 30, inactive: 2, suspended: 3 },
      },
    ],
    updatedAt: '2026-11-17T00:00:00Z',
    usageThrough: '2026-11-17',
    capabilities: { suspend: true, resume: true },
  };
}
export const testNumber: MobileNumber = {
  id: '1',
  mobile: '0810000001',
  owner: 'Test',
  package: null,
  status: 'active',
  usageMb: 1024,
  iccid: null,
  lot: 'LOT-A',
};
