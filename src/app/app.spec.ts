import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthSessionStore } from '@core/auth/auth-session.store';
import { APP_ENVIRONMENT } from '@core/config/app-environment.token';
import { LocaleService } from '@core/i18n/locale.service';
import { CorporateContext } from '@core/corporate/corporate-context.service';
import { en } from '@core/i18n/locales/en';
import { th } from '@core/i18n/locales/th';
import { CorporatePage } from '@features/corporate/corporate.page';
import { NumberDetailPage } from '@features/number-detail/number-detail.page';
import { testSession, testEnvironment } from '../testing/auth.fixture';
import { testNumber, testNumberPage } from '../testing/number-page.fixture';

describe('Portal integration', () => {
  let http: HttpTestingController;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'corporate', component: CorporatePage },
          { path: 'corporate/numbers/:id', component: NumberDetailPage },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_ENVIRONMENT, useValue: testEnvironment },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthSessionStore).set(testSession(true));
  });
  afterEach(() => {
    // The corporate page also loads its packages card; tests that do not check it get none.
    http
      .match((request) => request.url === '/api/v1/packages')
      .filter((request) => !request.cancelled)
      .forEach((request) => request.flush({ items: [], updatedAt: '2026-11-17T00:00:00Z' }));
    http.verify({ ignoreCancelled: true });
  });
  const pageRequest = (id = 'A') => {
    const pending = TestBed.inject(HttpTestingController)
      .match((request) => request.url === '/api/v1/corporates/' + id + '/numbers')
      .filter((request) => !request.cancelled);
    expect(pending).toHaveLength(1);
    return pending[0];
  };

  it('keeps the route, filters and selection when language changes without reloading data', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/corporate', CorporatePage);
    pageRequest().flush(testNumberPage([testNumber]));
    harness.detectChanges();
    page.setStatusFilter('active');
    harness.detectChanges();
    const request = pageRequest();
    expect(request.request.params.get('status')).toBe('active');
    request.flush(testNumberPage([testNumber]));
    harness.detectChanges();
    page.selectedNumberIds.set(['1']);
    for (const locale of ['th', 'en'] as const) {
      TestBed.inject(LocaleService).setLocale(locale);
      harness.detectChanges();
      expect(TestBed.inject(Router).url).toBe('/corporate');
      expect(page.statusFilter()).toBe('active');
      expect(page.selectedNumberIds()).toEqual(['1']);
    }
    http.expectNone((request) => request.url.includes('/numbers'));
  });

  it('lists packages in use with CRM quota types and no unconfirmed baht price', async () => {
    TestBed.inject(LocaleService).setLocale('en');
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/corporate', CorporatePage);
    pageRequest().flush(testNumberPage([testNumber]));
    http
      .match((request) => request.url === '/api/v1/packages')
      .filter((request) => !request.cancelled)
      .at(-1)!
      .flush({
        updatedAt: '2026-11-17T00:00:00Z',
        items: [
          {
            packageId: 'P1',
            name: 'Data 10GB',
            packageType: 'main',
            productNames: ['Bundle 10GB'],
            status: 'ACTIVE',
            priceRaw: 250,
            currency: 'THB',
            priceThb: 250,
            validityValue: 30,
            validityUnit: 'DAY',
            vatType: 'EXCLUDED',
            numbers: 2,
            quotas: [
              {
                serviceType: 'DATA',
                quotaType: 'VOLUME',
                amount: 10000,
                unit: 'MB',
                rawAmount: 10000,
                rawUom: 'MB',
              },
              {
                serviceType: 'DATA',
                quotaType: 'UNLIMITED',
                amount: null,
                unit: null,
                rawAmount: null,
                rawUom: null,
              },
            ],
          },
        ],
      });
    harness.detectChanges();
    const text = harness.routeNativeElement?.textContent ?? '';
    for (const value of [
      'Packages in use',
      'Data 10GB',
      'Bundle 10GB',
      'DATA · VOLUME · 10,000 MB',
      'DATA · UNLIMITED',
      '30 days',
      'VAT excluded',
    ]) {
      expect(text).toContain(value);
    }
    expect(text).toContain(page.packagePriceText(250));
    expect(page.packagePriceText(250)).toContain('250.00');
    expect(page.packagePriceText(null)).toBe(page.unknownValue);
    expect(page.packageValidityText(1, 'MONTH')).toBe('1 month');
    expect(page.packageValidityText(0, 'DAY')).toBe(page.unknownValue);
    expect(page.packageValidityText(5, 'unknown')).toBe(page.unknownValue);
    expect(page.packageVatText('unknown')).toBe(page.unknownValue);
  });

  it('opens a number on its own page: packages, balances and usage, no staff names', async () => {
    TestBed.inject(LocaleService).setLocale('en');
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/corporate', CorporatePage);
    pageRequest().flush(testNumberPage([testNumber]));
    harness.detectChanges();
    page.openDetails({ action: 'details', row: page.rows()[0] });
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/corporate/numbers/1');
    TestBed.tick();
    http.expectOne('/api/v1/corporates/A/numbers/1').flush({
      ...testNumber,
      iccid: '8966001',
      sourceStatus: 'ACTIVE',
      simInventoryStatus: 'IN_USE',
      numberInventoryStatus: 'PROVISIONED',
      voiceMinutes: 5,
      sms: null,
      activationDate: '2026-11-17T07:58:10Z',
      expiryDate: null,
      numberCreatedAt: '2026-10-25T02:07:52Z',
      numberUpdatedAt: null,
      packages: [
        {
          id: 'sp1',
          packageId: 'PCK-7',
          name: '4G01 Smart DATA & IOT',
          packageType: 'MAIN',
          productName: '4G Smart IoT 30MB',
          startDate: '2026-11-17T00:00:00Z',
          endDate: '2999-12-17T07:58:10Z',
          current: true,
          validityValue: 1,
          validityUnit: 'MONTH',
          priceThb: null,
          vatType: 'EXCLUDED',
        },
        {
          id: 'sp2',
          packageId: 'PCK-5',
          name: '4G Smart IoT 30MB add-on',
          packageType: 'ADDON',
          productName: null,
          startDate: '2026-11-17T00:00:00Z',
          endDate: '2999-12-17T07:58:10Z',
          current: true,
          validityValue: 1,
          validityUnit: 'MONTH',
          priceThb: null,
          vatType: null,
        },
      ],
      balances: [
        {
          id: 'q1',
          serviceType: 'DATA',
          unit: 'MB',
          total: 70,
          remaining: 20,
          capMax: true,
          startDate: null,
          expireDate: '2999-12-17T07:58:10Z',
          packageName: '4G Smart IoT 30MB add-on',
        },
      ],
      updatedAt: '2026-11-20T00:00:00Z',
      usageThrough: '2026-11-19',
    });
    harness.detectChanges();
    const text = document.body.textContent ?? '';
    for (const value of [
      '0810000001',
      '8966001',
      'IN_USE',
      'PROVISIONED',
      '4G Smart IoT 30MB',
      '4G01 Smart DATA & IOT',
      '1 month(s)',
      '4G Smart IoT 30MB add-on',
      'Cap max',
      '5 min',
    ]) {
      expect(text).toContain(value);
    }
    expect(text).not.toContain('manuwat');
  });

  it('says a number of another organization is not found', async () => {
    TestBed.inject(LocaleService).setLocale('en');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/corporate/numbers/x', NumberDetailPage);
    TestBed.tick();
    http
      .expectOne('/api/v1/corporates/A/numbers/x')
      .flush(
        { error: { code: 'NOT_FOUND', message: 'Record not found in this organization.' } },
        { status: 404, statusText: 'Not Found' },
      );
    harness.detectChanges();
    expect(document.body.textContent).toContain('Not found in the selected organization.');
  });

  it('uses full corporate summaries, sends filters to the API and clears old tenant data', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/corporate', CorporatePage);
    pageRequest().flush(testNumberPage([testNumber]));
    harness.detectChanges();
    expect(page.counts().total).toBe(35);
    expect(page.rows()).toHaveLength(1);
    expect(page.lots()[0].total).toBe(35);
    expect(harness.routeNativeElement?.textContent).toContain('Business Connect');
    expect(harness.routeNativeElement?.textContent).toContain('Share in group');
    expect(page.lotQuotaType('SOMETHING_NEW')).toBe('Unknown');
    expect(page.lotQuotaType(null)).toBe(page.unknownValue);
    // Corporate profile: plain CRM values only; missing ones stay "—".
    const profile = harness.routeNativeElement?.textContent ?? '';
    for (const value of [
      'OTHER – Cold chain',
      '0105512345678',
      'ACTIVE',
      'Somchai',
      '02-123-4567',
    ]) {
      expect(profile).toContain(value);
    }
    expect(page.withOther(null, undefined)).toBe(page.unknownValue);
    page.setLotFilter('LOT-A');
    page.setStatusFilter('active');
    harness.detectChanges();
    const filtered = pageRequest();
    expect(filtered.request.params.get('lot')).toBe('LOT-A');
    expect(filtered.request.params.get('status')).toBe('active');
    expect(filtered.request.params.get('page')).toBe('1');
    page.selectedNumberIds.set(['1']);
    TestBed.inject(CorporateContext).select('B');
    TestBed.tick();
    expect(filtered.cancelled).toBe(true);
    expect(page.selectedNumberIds()).toEqual([]);
    expect(page.lots()).toEqual([]);
    expect(page.lotFilter()).toBeNull();
    const next = pageRequest('B');
    expect(next.request.headers.get('X-Corporate-ID')).toBe('B');
    expect(next.request.params.has('lot')).toBe(false);
    next.flush(testNumberPage([]));
    harness.detectChanges();
    expect(page.rows()).toEqual([]);
  });

  it('provides a non-empty Thai translation for every English key', () => {
    expect(Object.keys(th).sort()).toEqual(Object.keys(en).sort());
    expect(Object.values(th).every((value) => value.trim().length > 0)).toBe(true);
  });
});
