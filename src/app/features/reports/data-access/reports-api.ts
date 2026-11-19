import { Page, pageResponse } from '@core/api/pagination';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { ApiClient } from '@core/api/api-client';
import {
  arrayOf,
  objectOf,
  parseResponse,
  ResponseCheck,
  text,
} from '@core/api/response-validation';

/** ค่าของ 1 แถว (คอลัมน์ต่างกันตามรายงาน ดู reports.config.ts); `null` = unknown, shown as "—". */
export type ReportRow = Record<string, string | number | null>;

const cellValue: ResponseCheck = (value) =>
  value === null ||
  typeof value === 'string' ||
  (typeof value === 'number' && Number.isFinite(value));

/** Every row must be a flat object of string/number/null cells. */
const reportRow: ResponseCheck = (value) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.values(value as Record<string, unknown>).every(cellValue);

const reportResponse = objectOf({ report: text, rows: arrayOf(reportRow) });

/** เรียก GET /api/v1/reports/{id} ของ Reporting service */
@Injectable({ providedIn: 'root' })
export class ReportsApi {
  private readonly api = inject(ApiClient);

  page(corporateId: string, reportId: string, params: Record<string, string | number | boolean>) {
    return this.api
      .get<unknown>('/reports/' + encodeURIComponent(reportId) + '/page', corporateId, params)
      .pipe(
        map((value) =>
          parseResponse<Page<ReportRow>>(value, pageResponse(reportRow), 'report page'),
        ),
      );
  }

  rows(corporateId: string, reportId: string, from: string, to: string) {
    const query = new URLSearchParams();
    if (from) query.set('from', from);
    if (to) query.set('to', to);
    const suffix = query.size ? `?${query}` : '';

    return this.api
      .get<unknown>(`/reports/${encodeURIComponent(reportId)}${suffix}`, corporateId)
      .pipe(
        map((value) => parseResponse<{ rows: ReportRow[] }>(value, reportResponse, 'report').rows),
      );
  }
}
