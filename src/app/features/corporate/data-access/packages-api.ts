import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { ApiClient } from '@core/api/api-client';
import {
  arrayOf,
  dateText,
  finiteNumber,
  nullable,
  objectOf,
  oneOf,
  parseResponse,
  text,
} from '@core/api/response-validation';

/** CRM quota types; anything else arrives as `unknown`. */
export const PACKAGE_QUOTA_TYPES = ['VOLUME', 'UNLIMITED', 'DURATION', 'unknown'] as const;

export interface PackageQuota {
  serviceType: string | null;
  quotaType: (typeof PACKAGE_QUOTA_TYPES)[number] | null;
  /** Converted amount (MB / min / SMS) only through a confirmed unit mapping. */
  amount: number | null;
  unit: string | null;
  rawAmount: number | null;
  rawUom: string | null;
}

/** A package the corporate's numbers currently use (read-only; selecting is on hold). */
export interface CorporatePackage {
  packageId: string;
  name: string | null;
  packageType: string | null;
  productNames: string[];
  status: string | null;
  priceRaw: number | null;
  currency: string | null;
  /** Null until the CRM `price_raw` scale is confirmed. */
  priceThb: number | null;
  numbers: number;
  quotas: PackageQuota[];
}

const packageResponse = objectOf({
  packageId: text,
  name: nullable(text),
  packageType: nullable(text),
  productNames: arrayOf(text),
  status: nullable(text),
  priceRaw: nullable(finiteNumber),
  currency: nullable(text),
  priceThb: nullable(finiteNumber),
  numbers: finiteNumber,
  quotas: arrayOf(
    objectOf({
      serviceType: nullable(text),
      quotaType: nullable(oneOf(PACKAGE_QUOTA_TYPES)),
      amount: nullable(finiteNumber),
      unit: nullable(text),
      rawAmount: nullable(finiteNumber),
      rawUom: nullable(text),
    }),
  ),
});

@Injectable({ providedIn: 'root' })
export class PackagesApi {
  private readonly api = inject(ApiClient);
  list(corporateId: string) {
    return this.api
      .get<unknown>('/packages', corporateId)
      .pipe(
        map((value) =>
          parseResponse<{ items: CorporatePackage[]; updatedAt: string }>(
            value,
            objectOf({ items: arrayOf(packageResponse), updatedAt: dateText }),
            'packages',
          ),
        ),
      );
  }
}
