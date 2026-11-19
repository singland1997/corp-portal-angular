import { testNumberPage } from '../../../../testing/number-page.fixture';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { CorporateDataService } from './corporate-data.service';
import { CorporateContext } from '@core/corporate/corporate-context.service';
import { AuthSessionStore } from '@core/auth/auth-session.store';
import { APP_ENVIRONMENT } from '@core/config/app-environment.token';
import { testSession, testEnvironment } from '../../../../testing/auth.fixture';

describe('Corporate API data', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CorporateDataService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_ENVIRONMENT, useValue: testEnvironment },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthSessionStore).set(testSession(true));
  });
  afterEach(() => http.verify({ ignoreCancelled: true }));
  it('cancels old requests and clears old data when the admin changes organization', () => {
    const service = TestBed.inject(CorporateDataService);
    TestBed.tick();
    const first = http.expectOne((request) => request.url === '/api/v1/corporates/A/numbers');
    expect(first.request.headers.get('X-Corporate-ID')).toBe('A');
    TestBed.inject(CorporateContext).select('B');
    TestBed.tick();
    expect(first.cancelled).toBe(true);
    expect(service.numbers()).toEqual([]);
    http
      .expectOne((request) => request.url === '/api/v1/corporates/B/numbers')
      .flush(testNumberPage());
    expect(service.resource.loading()).toBe(false);
  });
  it('keeps API errors visible and never substitutes local fixtures', () => {
    const service = TestBed.inject(CorporateDataService);
    TestBed.tick();
    http
      .expectOne((request) => request.url === '/api/v1/corporates/A/numbers')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    expect(service.resource.error()).toBe('serviceUnavailable');
    expect(service.numbers()).toEqual([]);
    service.resource.reload();
    TestBed.tick();
    http
      .expectOne((request) => request.url === '/api/v1/corporates/A/numbers')
      .flush(testNumberPage());
    expect(service.resource.error()).toBeNull();
  });
});
