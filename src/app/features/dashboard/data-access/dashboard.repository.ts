import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@core/api/api-client';
import { DashboardRange, DashboardSnapshot } from '../dashboard.models';
import { map } from 'rxjs';
import { parseResponse } from '@core/api/response-validation';
import { dashboardResponse } from './dashboard-response';

@Injectable({ providedIn: 'root' })
export class DashboardRepository {
  private readonly api = inject(ApiClient);
  /** No range = the API default (the last 7 synced days). */
  load(corporateId: string, range: DashboardRange | null = null) {
    return this.api
      .get<unknown>(
        '/dashboard',
        corporateId,
        range ? { from: range.from, to: range.to } : undefined,
      )
      .pipe(
        map((value) => parseResponse<DashboardSnapshot>(value, dashboardResponse, 'dashboard')),
      );
  }
}
