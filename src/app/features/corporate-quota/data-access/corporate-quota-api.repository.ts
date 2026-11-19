import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@core/api/api-client';
import { forkJoin, map } from 'rxjs';
import {
  DataPool,
  PoolMember,
  PoolTransaction,
  QuotaDraft,
  toMegabytes,
  PoolCapabilities,
} from '../corporate-quota.models';
import type { CorporateQuotaRepository } from './corporate-quota.repository';
import { parseResponse } from '@core/api/response-validation';
import {
  capabilitiesResponse,
  membersResponse,
  poolsResponse,
  transactionsResponse,
} from './corporate-quota-response';

@Injectable({ providedIn: 'root' })
export class CorporateQuotaApiRepository implements CorporateQuotaRepository {
  private readonly api = inject(ApiClient);
  load(corporateId: string) {
    return forkJoin({
      pools: this.api
        .get<unknown>('/pools', corporateId)
        .pipe(map((value) => parseResponse<DataPool[]>(value, poolsResponse, 'pools'))),
      members: this.api
        .get<unknown>('/pools/members', corporateId)
        .pipe(map((value) => parseResponse<PoolMember[]>(value, membersResponse, 'pool members'))),
      transactions: this.api
        .get<unknown>('/pools/transactions', corporateId)
        .pipe(
          map((value) =>
            parseResponse<PoolTransaction[]>(value, transactionsResponse, 'pool transactions'),
          ),
        ),
      capabilities: this.api
        .get<unknown>('/pools/capabilities', corporateId)
        .pipe(
          map((value) =>
            parseResponse<PoolCapabilities>(value, capabilitiesResponse, 'pool capabilities'),
          ),
        ),
    });
  }
  adjust(corporateId: string, poolId: string, draft: QuotaDraft) {
    return this.api
      .post<void>(
        `/pools/${encodeURIComponent(poolId)}/quota-adjustments`,
        {
          direction: draft.direction,
          amountMb: toMegabytes(draft.amount, draft.unit),
          reason: draft.reason.trim(),
        },
        corporateId,
      )
      .pipe(map(() => undefined));
  }
}
