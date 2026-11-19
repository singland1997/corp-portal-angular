import { inject, InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import {
  DataPool,
  PoolMember,
  PoolTransaction,
  QuotaDraft,
  PoolCapabilities,
} from '../corporate-quota.models';
import { CorporateQuotaApiRepository } from './corporate-quota-api.repository';

export interface CorporateQuotaSnapshot {
  pools: DataPool[];
  members: PoolMember[];
  transactions: PoolTransaction[];
  capabilities: PoolCapabilities;
}
export interface CorporateQuotaRepository {
  load(corporateId: string): Observable<CorporateQuotaSnapshot>;
  adjust(corporateId: string, poolId: string, draft: QuotaDraft): Observable<void>;
}
export const POOLING_REPOSITORY = new InjectionToken<CorporateQuotaRepository>(
  'CorporateQuotaRepository',
  {
    providedIn: 'root',
    factory: () => inject(CorporateQuotaApiRepository),
  },
);
