import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@core/api/api-client';
import { DashboardSnapshot } from '../dashboard.models';
import { map } from 'rxjs';
import { parseResponse } from '@core/api/response-validation';
import { dashboardResponse } from './dashboard-response';

@Injectable({ providedIn: 'root' })
export class DashboardRepository {
  private readonly api = inject(ApiClient);
  load(corporateId: string) {
    return this.api
      .get<unknown>('/dashboard', corporateId)
      .pipe(
        map((value) => parseResponse<DashboardSnapshot>(value, dashboardResponse, 'dashboard')),
      );
  }
}
