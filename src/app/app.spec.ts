import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AuthSessionStore } from '@core/auth/auth-session.store';
import { APP_ENVIRONMENT } from '@core/config/app-environment.token';
import { testSession, testEnvironment } from '../testing/auth.fixture';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { LocaleService } from '@core/i18n/locale.service';
import { en } from '@core/i18n/locales/en';
import { th } from '@core/i18n/locales/th';

import { CorporatePage } from '@features/corporate/corporate.page';
import { CorporateContext } from '@core/corporate/corporate-context.service';

describe('Portal integration', () => {
  it('keeps the current route, filters, selection and detail when language changes', async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'corporate', component: CorporatePage }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_ENVIRONMENT, useValue: testEnvironment },
      ],
    }).compileComponents();
    TestBed.inject(AuthSessionStore).set(testSession());
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/corporate', CorporatePage);
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/corporates/A')
      .flush({
        numbers: [
          {
            id: '081-555-0142',
            mobile: '081-555-0142',
            owner: 'Test',
            package: 'Plan',
            status: 'active',
            usageMb: 500,
            iccid: 'test',
            lot: 'L',
          },
        ],
        counts: { total: 1, active: 1, inactive: 0, suspended: 0 },
        updatedAt: '2026-11-16T00:00:00Z',
        capabilities: { suspend: true, resume: true },
      });
    harness.detectChanges();
    page.setStatusFilter('active');
    page.selectedNumberIds.set(['081-555-0142']);
    page.selectedNumber.set(page.rows()[0]);
    TestBed.inject(LocaleService).setLocale('th');
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/corporate');
    expect(page.statusFilter()).toBe('active');
    expect(page.selectedNumberIds()).toEqual(['081-555-0142']);
    expect(page.selectedNumber()?.id).toBe('081-555-0142');
    expect(harness.routeNativeElement?.textContent).toContain('ทะเบียนซิมและหมายเลข');
    TestBed.inject(LocaleService).setLocale('en');
    harness.detectChanges();
    expect(page.selectedNumber()?.id).toBe('081-555-0142');
  });
  it('summarizes multiple lots and combines lot/status filters within the selected corporate', async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'corporate', component: CorporatePage }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_ENVIRONMENT, useValue: testEnvironment },
      ],
    }).compileComponents();
    TestBed.inject(AuthSessionStore).set(testSession(true));
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/corporate', CorporatePage);
    const http = TestBed.inject(HttpTestingController);
    const number = (id: string, lot: string, status: string) => ({
      id,
      mobile: id,
      owner: 'Test',
      package: 'Plan',
      status,
      usageMb: 500,
      iccid: id,
      lot,
    });
    http.expectOne('/api/v1/corporates/A').flush({
      numbers: [
        number('1', 'LOT-A1', 'active'),
        number('2', 'LOT-A2', 'active'),
        number('3', 'LOT-A2', 'suspended'),
      ],
      counts: { total: 3, active: 2, inactive: 0, suspended: 1 },
      updatedAt: '2026-11-16T00:00:00Z',
      capabilities: { suspend: true, resume: true },
    });
    harness.detectChanges();
    expect(page.lots()).toEqual([
      { lot: 'LOT-A1', total: 1, active: 1, inactive: 0, suspended: 0 },
      { lot: 'LOT-A2', total: 2, active: 1, inactive: 0, suspended: 1 },
    ]);
    expect(harness.routeNativeElement?.textContent).toContain('LOT-A2');
    page.selectedNumberIds.set(['1']);
    page.setLotFilter('LOT-A2');
    expect(page.selectedNumberIds()).toEqual([]);
    expect(page.filteredRows().map((row) => row.id)).toEqual(['2', '3']);
    page.setStatusFilter('active');
    expect(page.filteredRows().map((row) => row.id)).toEqual(['2']);
    TestBed.inject(LocaleService).setLocale('th');
    harness.detectChanges();
    expect(page.lotFilter()).toBe('LOT-A2');
    expect(page.filteredRows().map((row) => row.id)).toEqual(['2']);
    page.clearFilters();
    expect(page.filteredRows()).toHaveLength(3);
    expect(page.lotFilter()).toBeNull();

    page.setLotFilter('LOT-A2');
    page.selectedNumberIds.set(['2']);
    TestBed.inject(CorporateContext).select('B');
    TestBed.tick();
    expect(page.lotFilter()).toBeNull();
    expect(page.selectedNumberIds()).toEqual([]);
    expect(page.lots()).toEqual([]);
    http.expectOne('/api/v1/corporates/B').flush({
      numbers: [number('4', 'LOT-B1', 'inactive')],
      counts: { total: 1, active: 0, inactive: 1, suspended: 0 },
      updatedAt: '2026-11-16T00:00:00Z',
      capabilities: { suspend: true, resume: true },
    });
    harness.detectChanges();
    expect(page.lots().map((lot) => lot.lot)).toEqual(['LOT-B1']);
    expect(page.filteredRows().map((row) => row.id)).toEqual(['4']);
    http.verify();
  });
  it('provides a non-empty Thai translation for every English key', () => {
    expect(Object.keys(th).sort()).toEqual(Object.keys(en).sort());
    expect(Object.values(th).every((value) => value.trim().length > 0)).toBe(true);
  });
});
