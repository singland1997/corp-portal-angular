import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { ApiClient } from '@core/api/api-client';
import { Page, pageResponse } from '@core/api/pagination';
import { parseResponse } from '@core/api/response-validation';
import { Invoice, InvoiceDetail, invoiceResponse, invoiceDetailResponse } from '../billing.models';

@Injectable({ providedIn: 'root' })
export class BillingApi {
  private readonly api = inject(ApiClient);

  page(corporateId: string, params: Record<string, string | number>) {
    return this.api
      .get<unknown>('/invoices/page', corporateId, params)
      .pipe(
        map((value) =>
          parseResponse<Page<Invoice>>(value, pageResponse(invoiceResponse), 'invoice page'),
        ),
      );
  }

  detail(corporateId: string, id: string) {
    return this.api
      .get<unknown>(`/invoices/${encodeURIComponent(id)}`, corporateId)
      .pipe(
        map((value) =>
          parseResponse<InvoiceDetail>(value, invoiceDetailResponse, 'invoice detail'),
        ),
      );
  }
}
