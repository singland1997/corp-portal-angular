import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { APP_ENVIRONMENT } from '@core/config/app-environment.token';
import { tap, timeout } from 'rxjs';
import { MutationKeys } from './mutation-keys.service';

@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly mutations = inject(MutationKeys);
  private readonly base = inject(APP_ENVIRONMENT).apiBaseUrl.replace(/\/$/, '') + '/v1';
  private headers(corporateId?: string): HttpHeaders {
    return new HttpHeaders(corporateId ? { 'X-Corporate-ID': corporateId } : {});
  }
  get<T>(path: string, corporateId?: string, params?: Record<string, string | number | boolean>) {
    return this.http
      .get<T>(this.base + path, { headers: this.headers(corporateId), params })
      .pipe(timeout(30000));
  }
  post<T>(path: string, body: unknown, corporateId?: string) {
    return this.mutate<T>('POST', path, body, corporateId);
  }
  patch<T>(path: string, body: unknown, corporateId?: string) {
    return this.mutate<T>('PATCH', path, body, corporateId);
  }
  delete<T>(path: string, body?: unknown) {
    return this.http.delete<T>(this.base + path, { body }).pipe(timeout(30000));
  }
  private mutate<T>(method: 'POST' | 'PATCH', path: string, body: unknown, corporateId?: string) {
    // Auth endpoints have their own session and refresh semantics.
    const operation = corporateId ? this.mutations.acquire(method, path, corporateId, body) : null;
    let headers = this.headers(corporateId);
    if (operation) headers = headers.set('Idempotency-Key', operation.key);
    return this.http.request<T>(method, this.base + path, { body, headers }).pipe(
      timeout(30000),
      tap({
        next: () => operation?.complete(),
        error: (error) => {
          if (
            error instanceof HttpErrorResponse &&
            error.status >= 400 &&
            error.status < 500 &&
            error.status !== 408
          )
            operation?.complete();
        },
      }),
    );
  }
}
