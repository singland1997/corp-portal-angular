import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { ApiClient } from '@core/api/api-client';
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
import { MobileNumber } from '@features/corporate/corporate.models';
import { mobileNumberResponse } from '@features/corporate/data-access/corporate-response';

export interface SubscribedPackage {
  id: string;
  packageId: string | null;
  name: string | null;
  /** CRM package type as stored (MAIN, ADDON, ...). */
  packageType: string | null;
  productName: string | null;
  startDate: string | null;
  endDate: string | null;
  /** Started and not yet ended. */
  current: boolean;
  validityValue: number | null;
  /** DAY, MONTH or YEAR. */
  validityUnit: string | null;
  priceThb: number | null;
  /** INCLUDED or EXCLUDED. */
  vatType: string | null;
}

/** One unexpired quota bucket; amounts in `unit` (MB, min, SMS or the CRM unit). */
export interface QuotaBalance {
  id: string;
  serviceType: string | null;
  unit: string | null;
  total: number | null;
  remaining: number | null;
  capMax: boolean | null;
  startDate: string | null;
  expireDate: string | null;
  packageName: string | null;
}

export interface NumberDetail extends MobileNumber {
  activationDate: string | null;
  expiryDate: string | null;
  numberCreatedAt: string | null;
  numberUpdatedAt: string | null;
  packages: SubscribedPackage[];
  balances: QuotaBalance[];
  updatedAt: string;
  usageThrough: string | null;
}

const detailResponse = objectOf({
  activationDate: nullable(dateText),
  expiryDate: nullable(dateText),
  numberCreatedAt: nullable(dateText),
  numberUpdatedAt: nullable(dateText),
  packages: arrayOf(
    objectOf({
      id: text,
      packageId: nullable(text),
      name: nullable(text),
      packageType: nullable(text),
      productName: nullable(text),
      startDate: nullable(dateText),
      endDate: nullable(dateText),
      current: bool,
      validityValue: nullable(finiteNumber),
      validityUnit: nullable(text),
      priceThb: nullable(finiteNumber),
      vatType: nullable(text),
    }),
  ),
  balances: arrayOf(
    objectOf({
      id: text,
      serviceType: nullable(text),
      unit: nullable(text),
      total: nullable(finiteNumber),
      remaining: nullable(finiteNumber),
      capMax: nullable(bool),
      startDate: nullable(dateText),
      expireDate: nullable(dateText),
      packageName: nullable(text),
    }),
  ),
  updatedAt: dateText,
  usageThrough: nullable(text),
});

@Injectable({ providedIn: 'root' })
export class NumberDetailApi {
  private readonly api = inject(ApiClient);
  get(corporateId: string, numberId: string) {
    return this.api
      .get<unknown>(
        `/corporates/${encodeURIComponent(corporateId)}/numbers/${encodeURIComponent(numberId)}`,
        corporateId,
      )
      .pipe(
        map((value) =>
          parseResponse<NumberDetail>(
            value,
            (v: unknown) => mobileNumberResponse(v) && detailResponse(v),
            'number detail',
          ),
        ),
      );
  }
}
