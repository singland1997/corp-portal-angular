import { HttpErrorResponse } from '@angular/common/http';
import { canSee, workspaceNavigation } from '@core/routing/portal-navigation';
import { formatDataSize } from '@shared/utils/data-size';
import { csvCell } from '@shared/utils/csv';
import {
  commandResponse,
  corporateSnapshotResponse,
} from '@features/corporate/data-access/corporate-response';
import { matchesStatus, summarizeLots, MobileNumber } from '@features/corporate/corporate.models';
import { dashboardResponse } from '@features/dashboard/data-access/dashboard-response';
import {
  capabilitiesResponse,
  membersResponse,
  poolsResponse,
  transactionsResponse,
} from '@features/pooling/data-access/pooling-response';
import { DataPool, matchesDateRange, quotaError } from '@features/pooling/pooling.models';
import { apiErrorMessage } from './api-error';

const number = (overrides: Partial<MobileNumber>): MobileNumber => ({
  id: 'n',
  mobile: '0810000000',
  owner: null,
  package: null,
  status: null,
  usageMb: null,
  iccid: null,
  lot: null,
  ...overrides,
});

describe('nullable source contracts', () => {
  it('accepts unknown values as null but still rejects malformed responses', () => {
    const snapshot = {
      numbers: [number({})],
      counts: { total: 1, active: 0, inactive: 0, suspended: 0 },
      updatedAt: '2026-11-16T00:00:00Z',
      capabilities: { suspend: false, resume: false },
    };
    expect(corporateSnapshotResponse(snapshot)).toBe(true);
    expect(
      corporateSnapshotResponse({ ...snapshot, numbers: [{ ...number({}), usageMb: 'x' }] }),
    ).toBe(false);
    expect(
      corporateSnapshotResponse({ ...snapshot, numbers: [{ ...number({}), status: 'weird' }] }),
    ).toBe(false);
    expect(corporateSnapshotResponse({ ...snapshot, capabilities: { suspend: 'no' } })).toBe(false);
  });

  it('validates dashboard gaps and raw activity without fabricated mobiles', () => {
    const dashboard = {
      updatedAt: '2026-11-16T00:00:00Z',
      periodStart: '2026-11-01',
      dailyUsageFrom: '2026-11-10',
      numbers: { total: 0, active: 0, inactive: 0, suspended: 0 },
      totalUsageTb: null,
      pool: { usedTb: null, quotaTb: null, unknownPools: 2 },
      dailyUsageGb: [null, 0.1],
      activity: [
        { mobile: null, operation: 'SIM_SWAP', status: null, time: '2026-11-10T03:00:00Z' },
      ],
      activityComplete: false,
    };
    expect(dashboardResponse(dashboard)).toBe(true);
    expect(dashboardResponse({ ...dashboard, dailyUsageGb: [Number.NaN] })).toBe(false);
  });

  it('validates pool contracts with unknown quantities and ambiguous history', () => {
    expect(
      poolsResponse([
        {
          id: 'p',
          corporateId: 'c',
          name: null,
          corporate: 'C',
          lot: null,
          status: 'active',
          service: 'DATA',
          quotaMb: null,
          usedMb: null,
          remainingMb: null,
          expiresAt: null,
          memberCount: 0,
          sourceState: 'partial',
        },
      ]),
    ).toBe(true);
    expect(
      membersResponse([
        {
          id: 's',
          poolId: 'p',
          mobile: '081',
          assignedTo: null,
          department: 'Ops team',
          usedMb: null,
          status: null,
        },
      ]),
    ).toBe(true);
    expect(
      transactionsResponse([
        {
          id: 't',
          poolId: 'p',
          type: 'TOPUP',
          occurredAt: null,
          amountMb: 1,
          totalAfterMb: null,
          remainingAfterMb: null,
          afterQuantityMb: 10,
          performedBy: null,
          reason: null,
        },
      ]),
    ).toBe(true);
    expect(capabilitiesResponse({ quotaAdjust: false })).toBe(true);
  });
});

describe('unknown values in presentation', () => {
  it('never renders or sums unknown values as zero', () => {
    expect(formatDataSize(null)).toBe('—');
    expect(formatDataSize(0)).toBe('0 MB');
    expect(csvCell(null)).toBe('""');
  });

  it('keeps unknown lots and statuses filterable', () => {
    const numbers = [
      number({ lot: 'B', status: 'active' }),
      number({ lot: null }),
      number({ lot: 'A' }),
    ];
    expect(summarizeLots(numbers).map((l) => l.lot)).toEqual(['A', 'B', null]);
    expect(summarizeLots(numbers)[1].active).toBe(1);
    expect(matchesStatus(null, 'unknown')).toBe(true);
    expect(matchesStatus(null, 'active')).toBe(false);
    expect(matchesStatus('active', 'all')).toBe(true);
  });

  it('blocks quota changes when the quota is unknown and filters undated rows', () => {
    const pool = { status: 'active', quotaMb: null, usedMb: null } as DataPool;
    expect(quotaError(pool, { direction: 'increase', amount: 1, unit: 'MB', reason: 'x' })).toBe(
      'quotaUnknown',
    );
    expect(matchesDateRange(null, '', '')).toBe(true);
    expect(matchesDateRange(null, '2026-11-01', '')).toBe(false);
  });
});

describe('access and errors', () => {
  it('shows Roles only to System admins', () => {
    const roles = workspaceNavigation.find((item) => item.path === '/roles')!;
    expect(canSee(roles, 'admin')).toBe(true);
    expect(canSee(roles, 'sales')).toBe(false);
    expect(canSee(roles, 'corporate')).toBe(false);
    expect(
      canSee(
        workspaceNavigation.find((item) => item.path === '/sim')!,
        'corporate',
      ),
    ).toBe(true);
  });

  it('explains missing command APIs and unsynchronized data', () => {
    const failure = (code: string) =>
      new HttpErrorResponse({ status: 503, error: { error: { code, message: 'x' } } });
    expect(apiErrorMessage(failure('COMMAND_API_UNAVAILABLE'))).toBe('commandUnavailable');
    expect(apiErrorMessage(failure('SOURCE_NOT_SYNCED'))).toBe('sourceNotSynced');
    expect(apiErrorMessage(failure('SERVICE_NOT_READY'))).toBe('serviceUnavailable');
  });
});

describe('number commands', () => {
  it('accepts only real per-number outcomes from the provisioning API', () => {
    const response = {
      action: 'suspend',
      results: [
        { id: 'a', mobile: '081', outcome: 'accepted', errorCode: null },
        { id: 'b', mobile: '082', outcome: 'unknown', errorCode: 'UPSTREAM_TIMEOUT' },
      ],
    };
    expect(commandResponse(response)).toBe(true);
    expect(
      commandResponse({
        ...response,
        results: [{ id: 'a', mobile: '081', outcome: 'done', errorCode: null }],
      }),
    ).toBe(false);
    expect(commandResponse({ ...response, action: 'delete' })).toBe(false);
  });
});
