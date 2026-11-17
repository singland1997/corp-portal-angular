import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { appConfig } from '../../app.config';
import { APP_ENVIRONMENT } from '@core/config/app-environment.token';
import { AuthSessionStore } from './auth-session.store';
import { testEnvironment, testSession } from '../../../testing/auth.fixture';

describe('Authentication at application startup', () => {
  afterEach(() => sessionStorage.clear());

  it('waits for the API refresh before completing application initialization', async () => {
    sessionStorage.clear();
    sessionStorage.setItem('corp-portal.refresh-token', 'a'.repeat(64));
    TestBed.configureTestingModule({
      providers: [
        ...appConfig.providers,
        provideHttpClientTesting(),
        { provide: APP_ENVIRONMENT, useValue: testEnvironment },
      ],
    });
    const initialization = TestBed.inject(ApplicationInitStatus);
    // TestBed runs the configured application initializers when creating its injector.
    const http = TestBed.inject(HttpTestingController);
    expect(initialization.done).toBe(false);
    http.expectOne('/api/v1/auth/sessions/refresh').flush(testSession());
    await initialization.donePromise;
    expect(initialization.done).toBe(true);
    expect(TestBed.inject(AuthSessionStore).user()?.id).toBe('user');
    http.verify();
  });
});
