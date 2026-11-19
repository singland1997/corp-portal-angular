import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthSessionStore } from '@core/auth/auth-session.store';
import { APP_ENVIRONMENT } from '@core/config/app-environment.token';
import { testEnvironment, testSession } from '../../../testing/auth.fixture';
import { MyCorporatesPage } from './my-corporates.page';

describe('MyCorporatesPage', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_ENVIRONMENT, useValue: testEnvironment },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const session = testSession(true);
    TestBed.inject(AuthSessionStore).set({ ...session, user: { ...session.user, role: 'sales' } });
  });

  afterEach(() => http.verify());

  it('claims an unassigned corporate and refreshes the signed-in user', async () => {
    const fixture = TestBed.createComponent(MyCorporatesPage);
    fixture.detectChanges();
    TestBed.tick();
    http.expectOne('/api/v1/sales/corporates').flush({
      mine: [{ id: 'A', name: 'Alpha' }],
      available: [
        { id: 'C', name: 'Charlie', code: 'CHR' },
        { id: 'D', name: 'Delta' },
      ],
    });
    const page = fixture.componentInstance;
    expect(page.onlyOne()).toBe(true);

    page.search.set('chr');
    expect(page.available().map((c) => c.id)).toEqual(['C']);

    const done = page.claim(page.available()[0]);
    http.expectOne({ method: 'POST', url: '/api/v1/sales/corporates/C' }).flush(null);
    await Promise.resolve();
    const user = testSession(true).user;
    http.expectOne('/api/v1/auth/me').flush({ ...user, role: 'sales' });
    await done;
    TestBed.tick();
    http.expectOne('/api/v1/sales/corporates').flush({ mine: [], available: [] });
    expect(page.error()).toBeNull();
  });

  it('explains a corporate another sales user took first', async () => {
    const fixture = TestBed.createComponent(MyCorporatesPage);
    fixture.detectChanges();
    TestBed.tick();
    http.expectOne('/api/v1/sales/corporates').flush({
      mine: [{ id: 'A', name: 'Alpha' }],
      available: [{ id: 'C', name: 'Charlie' }],
    });
    const page = fixture.componentInstance;
    const done = page.claim(page.available()[0]);
    http
      .expectOne('/api/v1/sales/corporates/C')
      .flush(
        { error: { code: 'CORPORATE_TAKEN', message: 'taken' } },
        { status: 409, statusText: 'Conflict' },
      );
    await done;
    TestBed.tick();
    http.expectOne('/api/v1/sales/corporates').flush({ mine: [], available: [] });
    expect(page.error()).toBe(page.t('taken'));
  });
});
