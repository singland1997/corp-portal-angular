import { TestBed } from '@angular/core/testing';
import {
  provideRouter,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  convertToParamMap,
} from '@angular/router';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { authGuard, guestGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { AuthSessionStore } from './auth-session.store';
import { authInterceptor, isPortalApi } from './auth.interceptor';
import { APP_ENVIRONMENT } from '@core/config/app-environment.token';
import { CorporateContext } from '@core/corporate/corporate-context.service';
import { apiErrorMessage } from '@core/api/api-error';
import { testSession, testEnvironment } from '../../../testing/auth.fixture';

describe('API authentication and corporate context', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: APP_ENVIRONMENT, useValue: testEnvironment },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });
  it('posts credentials to API and keeps the returned token only in memory', async () => {
    const auth = TestBed.inject(AuthService);
    const pending = auth.signIn(' test@example.test ', 'secret');
    const req = http.expectOne('/api/v1/auth/sessions');
    expect(req.request.body).toEqual({ email: 'test@example.test', password: 'secret' });
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush(testSession());
    await pending;
    expect(auth.user()?.id).toBe('user');
    expect(TestBed.inject(AuthSessionStore).token()).toBe('test-token');
    expect(sessionStorage.getItem('corp-portal.session')).toBeNull();
    expect(sessionStorage.getItem('corp-portal.refresh-token')).toBe('a'.repeat(64));
  });
  it('rejects failed logins without falling back to frontend accounts', async () => {
    const auth = TestBed.inject(AuthService),
      pending = auth.signIn('test@example.test', 'bad');
    const rejected = expect(pending).rejects.toBeDefined();
    http.expectOne('/api/v1/auth/sessions').flush({}, { status: 401, statusText: 'Unauthorized' });
    await rejected;
    expect(auth.user()).toBeNull();
  });
  it('rejects a malformed login response without reporting a connection failure', async () => {
    const pending = TestBed.inject(AuthService).signIn('test@example.test', 'secret');
    const message = pending.catch(apiErrorMessage);
    const { refreshToken: _refresh, ...invalidSession } = testSession();
    http.expectOne('/api/v1/auth/sessions').flush(invalidSession);
    expect(await message).toBe('invalidServiceResponse');
    expect(TestBed.inject(AuthSessionStore).token()).toBeNull();
  });
  it('sends tokens only to the configured API and clears the matching session on 401', async () => {
    const session = TestBed.inject(AuthSessionStore);
    session.set(testSession());
    const client = TestBed.inject(HttpClient);
    const external = firstValueFrom(client.get('https://outside.example/data'));
    const ext = http.expectOne('https://outside.example/data');
    expect(ext.request.headers.has('Authorization')).toBe(false);
    ext.flush({});
    await external;
    const pending = firstValueFrom(client.get('/api/v1/dashboard'));
    const rejected = expect(pending).rejects.toBeDefined();
    const req = http.expectOne('/api/v1/dashboard');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
    req.flush({}, { status: 401, statusText: 'Unauthorized' });
    await rejected;
    expect(session.user()).toBeNull();
    expect(isPortalApi('/api-else/data', '/api', 'https://portal.example')).toBe(false);
  });
  it('does not let a delayed 401 clear a newer login', async () => {
    const session = TestBed.inject(AuthSessionStore);
    session.set(testSession());
    const pending = firstValueFrom(TestBed.inject(HttpClient).get('/api/v1/dashboard'));
    const rejected = expect(pending).rejects.toBeDefined();
    const req = http.expectOne('/api/v1/dashboard');
    session.set(testSession(false, 'new-token'));
    req.flush({}, { status: 401, statusText: 'Unauthorized' });
    await rejected;
    expect(session.token()).toBe('new-token');
  });
  it('calls server logout and clears the in-memory session even if the request fails', async () => {
    const session = TestBed.inject(AuthSessionStore);
    session.set(testSession());
    const pending = TestBed.inject(AuthService).signOut();
    expect(sessionStorage.getItem('corp-portal.refresh-token')).toBeNull();
    const rejected = expect(pending).rejects.toBeDefined();
    const req = http.expectOne('/api/v1/auth/sessions/current');
    expect(req.request.method).toBe('DELETE');
    req.flush({}, { status: 503, statusText: 'Unavailable' });
    await rejected;
    expect(session.token()).toBeNull();
  });
  it('restricts organization selection to the API-provided admin scope', () => {
    const session = TestBed.inject(AuthSessionStore),
      corporate = TestBed.inject(CorporateContext);
    session.set(testSession());
    corporate.select('B');
    expect(corporate.current()?.id).toBe('A');
    expect(corporate.canSwitch()).toBe(false);
    session.set(testSession(true));
    corporate.select('B');
    expect(corporate.current()?.id).toBe('B');
    corporate.select('C');
    expect(corporate.current()?.id).toBe('B');
    session.clear();
    expect(corporate.current()).toBeNull();
  });
  it('expires sessions and protects deep links', () => {
    const session = TestBed.inject(AuthSessionStore),
      router = TestBed.inject(Router);
    const guard = () =>
      TestBed.runInInjectionContext(() =>
        authGuard(
          {} as ActivatedRouteSnapshot,
          { url: '/corporate?status=active' } as RouterStateSnapshot,
        ),
      );
    session.set(testSession());
    expect(guard()).toBe(true);
    const guest = TestBed.runInInjectionContext(() =>
      guestGuard(
        { queryParamMap: convertToParamMap({ returnUrl: '/data-pool' }) } as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
      ),
    );
    expect(guest).toEqual(router.parseUrl('/dashboard'));
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + 901000);
    expect(guard()).toEqual(router.createUrlTree(['/login']));
    vi.restoreAllMocks();
  });
  it('restores a session once using the API and persists the rotated refresh token', async () => {
    sessionStorage.setItem('corp-portal.refresh-token', 'a'.repeat(64));
    const auth = TestBed.inject(AuthService);
    const pending = auth.restoreSession();
    expect(auth.restoreSession()).toBe(pending);
    expect(auth.user()).toBeNull();
    expect(sessionStorage.getItem('corp-portal.refresh-token')).toBeNull();
    const request = http.expectOne('/api/v1/auth/sessions/refresh');
    expect(request.request.body).toEqual({ refreshToken: 'a'.repeat(64) });
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ ...testSession(), refreshToken: 'b'.repeat(64) });
    await pending;
    expect(auth.user()?.id).toBe('user');
    expect(sessionStorage.getItem('corp-portal.refresh-token')).toBe('b'.repeat(64));
    expect(
      TestBed.runInInjectionContext(() =>
        authGuard({} as ActivatedRouteSnapshot, { url: '/data-pool' } as RouterStateSnapshot),
      ),
    ).toBe(true);
  });
  it('requires login when the saved refresh token is revoked and does not retry it', async () => {
    sessionStorage.setItem('corp-portal.refresh-token', 'a'.repeat(64));
    const auth = TestBed.inject(AuthService);
    const pending = auth.restoreSession();
    http
      .expectOne('/api/v1/auth/sessions/refresh')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    await pending;
    await auth.restoreSession();
    http.expectNone('/api/v1/auth/sessions/refresh');
    expect(auth.user()).toBeNull();
    expect(sessionStorage.getItem('corp-portal.refresh-token')).toBeNull();
  });
  it('ignores malformed saved tokens', async () => {
    sessionStorage.setItem('corp-portal.refresh-token', 'invalid');
    await TestBed.inject(AuthService).restoreSession();
    http.expectNone('/api/v1/auth/sessions/refresh');
    expect(sessionStorage.getItem('corp-portal.refresh-token')).toBeNull();
  });
  it('accepts sales sessions and rejects the retired role', () => {
    const session = TestBed.inject(AuthSessionStore);
    const response = testSession(true);
    session.set({ ...response, user: { ...response.user, role: 'sales' } });
    expect(session.user()?.role).toBe('sales');
    expect(() =>
      session.set({
        ...response,
        user: { ...response.user, role: 'viewer' },
      } as unknown as typeof response),
    ).toThrow();
  });
});
