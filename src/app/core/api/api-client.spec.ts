import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors, HttpErrorResponse } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom, TimeoutError } from 'rxjs';
import { ApiClient } from './api-client';
import { apiErrorMessage } from './api-error';
import { authInterceptor } from '@core/auth/auth.interceptor';
import { AuthSessionStore } from '@core/auth/auth-session.store';
import { APP_ENVIRONMENT } from '@core/config/app-environment.token';
import { testEnvironment, testSession } from '../../../testing/auth.fixture';

describe('Request safety', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: APP_ENVIRONMENT, useValue: testEnvironment },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthSessionStore).set(testSession());
    TestBed.tick();
  });
  afterEach(() => http.verify());
  it('reuses an ambiguous mutation key across retries and refresh, then starts a new operation after success', async () => {
    const client = TestBed.inject(ApiClient);
    const failed = firstValueFrom(client.post('/pools/p/quota-adjustments', { amountMb: 1 }, 'A'));
    const failure = failed.catch(apiErrorMessage);
    const first = http.expectOne('/api/v1/pools/p/quota-adjustments');
    const key = first.request.headers.get('Idempotency-Key');
    expect(key).toMatch(/^[0-9a-f-]{36}$/);
    first.flush({}, { status: 504, statusText: 'Timeout' });
    expect(await failure).toBe('requestTimeout');
    TestBed.inject(AuthSessionStore).set(testSession(false, 'rotated-access'));
    TestBed.tick();
    const retry = firstValueFrom(client.post('/pools/p/quota-adjustments', { amountMb: 1 }, 'A'));
    const second = http.expectOne('/api/v1/pools/p/quota-adjustments');
    expect(second.request.headers.get('Idempotency-Key')).toBe(key);
    second.flush(null);
    await retry;
    const another = firstValueFrom(client.post('/pools/p/quota-adjustments', { amountMb: 1 }, 'A'));
    const third = http.expectOne('/api/v1/pools/p/quota-adjustments');
    expect(third.request.headers.get('Idempotency-Key')).not.toBe(key);
    third.flush(null);
    await another;
  });
  it('uses separate keys for different tenants and does not attach business keys to login', async () => {
    const client = TestBed.inject(ApiClient);
    const a = firstValueFrom(client.post('/pools', { name: 'p' }, 'A'));
    const aRequest = http.expectOne('/api/v1/pools');
    const b = firstValueFrom(client.post('/pools', { name: 'p' }, 'B'));
    const bRequest = http.expectOne('/api/v1/pools');
    expect(aRequest.request.headers.get('Idempotency-Key')).not.toBe(
      bRequest.request.headers.get('Idempotency-Key'),
    );
    aRequest.flush(null);
    bRequest.flush(null);
    await Promise.all([a, b]);
    const login = firstValueFrom(client.post('/auth/sessions', { email: 'test' }));
    const request = http.expectOne('/api/v1/auth/sessions');
    expect(request.request.headers.has('Idempotency-Key')).toBe(false);
    request.flush(null);
    await login;
  });
  it('maps both timeout sources', () => {
    expect(apiErrorMessage(new TimeoutError())).toBe('requestTimeout');
    expect(apiErrorMessage(new HttpErrorResponse({ status: 504 }))).toBe('requestTimeout');
  });
});
