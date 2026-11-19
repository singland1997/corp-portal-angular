import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { ApiClient } from '@core/api/api-client';
import { Page, pageResponse } from '@core/api/pagination';
import {
  arrayOf,
  bool,
  dateText,
  finiteNumber,
  nullable,
  objectOf,
  parseResponse,
  text,
} from '@core/api/response-validation';

export interface DataPoolBalance {
  id: string;
  service: string | null;
  unit: string | null;
  total: number | null;
  remaining: number | null;
  used: number | null;
  activeMembers: number;
  startsAt: string | null;
  expiresAt: string | null;
  status: string | null;
  expired: boolean;
}
export interface DataPoolTransaction {
  id: string;
  occurredAt: string | null;
  action: string | null;
  service: string | null;
  unit: string | null;
  changeAmount: number | null;
  balanceAfter: number | null;
  description: string | null;
}

const balanceResponse = objectOf({
  id: text,
  service: nullable(text),
  unit: nullable(text),
  total: nullable(finiteNumber),
  remaining: nullable(finiteNumber),
  used: nullable(finiteNumber),
  activeMembers: finiteNumber,
  startsAt: nullable(dateText),
  expiresAt: nullable(dateText),
  status: nullable(text),
  expired: bool,
});
const transactionResponse = objectOf({
  id: text,
  occurredAt: nullable(dateText),
  action: nullable(text),
  service: nullable(text),
  unit: nullable(text),
  changeAmount: nullable(finiteNumber),
  balanceAfter: nullable(finiteNumber),
  description: nullable(text),
});

@Injectable({ providedIn: 'root' })
export class DataPoolApi {
  private readonly api = inject(ApiClient);
  summary(id: string) {
    return this.api
      .get<unknown>('/pools/corporate-quota', id)
      .pipe(
        map((value) =>
          parseResponse<{ items: DataPoolBalance[]; updatedAt: string }>(
            value,
            objectOf({ items: arrayOf(balanceResponse), updatedAt: dateText }),
            'corporate quota',
          ),
        ),
      );
  }
  history(id: string, params: Record<string, string | number>) {
    return this.api
      .get<unknown>('/pools/corporate-quota/history/page', id, params)
      .pipe(
        map((value) =>
          parseResponse<Page<DataPoolTransaction>>(
            value,
            pageResponse(transactionResponse),
            'quota history',
          ),
        ),
      );
  }
}
