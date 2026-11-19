import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { ApiClient } from '@core/api/api-client';
import {
  arrayOf,
  nullable,
  objectOf,
  optional,
  parseResponse,
  text,
} from '@core/api/response-validation';

export interface CorporateChoice {
  id: string;
  code?: string | null;
  name: string;
  nameTh?: string | null;
}

export interface CorporateChoices {
  mine: CorporateChoice[];
  available: CorporateChoice[];
}

const choice = objectOf({
  id: text,
  code: optional(nullable(text)),
  name: text,
  nameTh: optional(nullable(text)),
});

@Injectable({ providedIn: 'root' })
export class MyCorporatesApi {
  private readonly api = inject(ApiClient);

  list() {
    return this.api
      .get<unknown>('/sales/corporates')
      .pipe(
        map((value) =>
          parseResponse<CorporateChoices>(
            value,
            objectOf({ mine: arrayOf(choice), available: arrayOf(choice) }),
            'myCorporates',
          ),
        ),
      );
  }

  claim(id: string) {
    return this.api.post<void>(`/sales/corporates/${encodeURIComponent(id)}`, null);
  }

  release(id: string) {
    return this.api.delete<void>(`/sales/corporates/${encodeURIComponent(id)}`);
  }
}
