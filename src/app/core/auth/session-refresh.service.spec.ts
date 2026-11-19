import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AuthSessionStore } from './auth-session.store';
import { SessionRefresh } from './session-refresh.service';
import { authInterceptor } from './auth.interceptor';
import { APP_ENVIRONMENT } from '@core/config/app-environment.token';
import { testEnvironment, testSession } from '../../../testing/auth.fixture';

describe('Session refresh lifecycle', () => {
  let http: HttpTestingController;
  let session: AuthSessionStore;
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: APP_ENVIRONMENT, useValue: testEnvironment },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    session = TestBed.inject(AuthSessionStore);
    TestBed.inject(SessionRefresh);
  });
  afterEach(() => {
    http.verify();
    sessionStorage.clear();
    vi.useRealTimers();
  });
  it('refreshes once before expiry and persists the rotated refresh token', () => {
    session.set(testSession());
    TestBed.tick();
    vi.advanceTimersByTime(840000);
    const request = http.expectOne('/api/v1/auth/sessions/refresh');
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(request.request.body).toEqual({ refreshToken: 'a'.repeat(64) });
    request.flush({ ...testSession(false, 'replacement'), refreshToken: 'b'.repeat(64) });
    expect(session.token()).toBe('replacement');
    expect(session.session()?.refreshToken).toBe('b'.repeat(64));
    expect(sessionStorage.getItem('corp-portal.refresh-token')).toBe('b'.repeat(64));
  });
  it('keeps the current session until expiry after a transient refresh failure without replaying the token', () => {
    session.set(testSession());
    TestBed.tick();
    vi.advanceTimersByTime(840000);
    http
      .expectOne('/api/v1/auth/sessions/refresh')
      .flush({}, { status: 504, statusText: 'Timeout' });
    expect(session.user()?.id).toBe('user');
    expect(session.renewalFailed()).toBe(true);
    expect(sessionStorage.getItem('corp-portal.refresh-token')).toBeNull();
    TestBed.tick();
    vi.advanceTimersByTime(60000);
    expect(session.user()).toBeNull();
    http.expectNone('/api/v1/auth/sessions/refresh');
  });
  it('cancels a pending refresh on logout', () => {
    session.set(testSession());
    TestBed.tick();
    vi.advanceTimersByTime(840000);
    const request = http.expectOne('/api/v1/auth/sessions/refresh');
    session.clear();
    TestBed.tick();
    expect(request.cancelled).toBe(true);
    expect(session.user()).toBeNull();
  });
  it('does not publish a refresh response after sign out begins', () => {
    session.set(testSession());
    TestBed.tick();
    vi.advanceTimersByTime(840000);
    const request = http.expectOne('/api/v1/auth/sessions/refresh');
    session.signingOut.set(true);
    request.flush(testSession(false, 'rotated-during-logout'));
    expect(session.token()).toBe('test-token');
    TestBed.tick();
    vi.advanceTimersByTime(30000);
    http.expectNone('/api/v1/auth/sessions/refresh');
  });
});
