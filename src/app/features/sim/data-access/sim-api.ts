import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { ApiClient } from '@core/api/api-client';
import { arrayOf, objectOf, parseResponse } from '@core/api/response-validation';
import { MobileNumber } from '../../corporate/corporate.models';
import { mobileNumberResponse } from '../../corporate/data-access/corporate-response';

@Injectable({ providedIn: 'root' })
export class SimApi {
  private readonly api = inject(ApiClient);

  list(corporateId: string) {
    return this.api
      .get<unknown>('/sims', corporateId)
      .pipe(
        map(
          (value) =>
            parseResponse<{ items: MobileNumber[] }>(
              value,
              objectOf({ items: arrayOf(mobileNumberResponse) }),
              'SIM list',
            ).items,
        ),
      );
  }
}
