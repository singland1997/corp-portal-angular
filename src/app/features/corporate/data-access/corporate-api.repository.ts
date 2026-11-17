import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@core/api/api-client';
import { CommandResult, CorporateSnapshot, NumberAction } from '../corporate.models';
import type { CorporateRepository } from './corporate.repository';
import { map } from 'rxjs';
import { parseResponse } from '@core/api/response-validation';
import { commandResponse, corporateSnapshotResponse } from './corporate-response';

@Injectable({ providedIn: 'root' })
export class CorporateApiRepository implements CorporateRepository {
  private readonly api = inject(ApiClient);

  load(id: string) {
    return this.api
      .get<unknown>(`/corporates/${encodeURIComponent(id)}`, id)
      .pipe(
        map((value) =>
          parseResponse<CorporateSnapshot>(value, corporateSnapshotResponse, 'corporate'),
        ),
      );
  }

  command(corporateId: string, action: NumberAction, ids: readonly string[]) {
    return this.api
      .post<unknown>(
        `/corporates/${encodeURIComponent(corporateId)}/numbers/${action}`,
        { ids },
        corporateId,
      )
      .pipe(
        map(
          (value) =>
            parseResponse<{ results: CommandResult[] }>(value, commandResponse, 'number command')
              .results,
        ),
      );
  }
}
