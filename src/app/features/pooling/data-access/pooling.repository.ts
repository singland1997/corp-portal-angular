import { inject, InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import {
  DataPool,
  PoolMember,
  PoolTransaction,
  PoolDraft,
  QuotaDraft,
  PoolInventoryItem,
  PoolCapabilities,
} from '../pooling.models';
import { PoolingApiRepository } from './pooling-api.repository';

export interface PoolingSnapshot {
  pools: DataPool[];
  members: PoolMember[];
  transactions: PoolTransaction[];
  inventory: PoolInventoryItem[];
  capabilities: PoolCapabilities;
}
export interface PoolingRepository {
  load(corporateId: string): Observable<PoolingSnapshot>;
  save(corporateId: string, draft: PoolDraft, id?: string): Observable<void>;
  adjust(corporateId: string, poolId: string, draft: QuotaDraft): Observable<void>;
}
export const POOLING_REPOSITORY = new InjectionToken<PoolingRepository>('PoolingRepository', {
  providedIn: 'root',
  factory: () => inject(PoolingApiRepository),
});
