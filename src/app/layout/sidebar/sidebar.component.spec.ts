import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthSessionStore } from '@core/auth/auth-session.store';
import { APP_ENVIRONMENT } from '@core/config/app-environment.token';
import { CorporateContext } from '@core/corporate/corporate-context.service';
import { CorporateSelectComponent } from '@layout/corporate-select/corporate-select.component';
import { testEnvironment, testSession } from '../../../testing/auth.fixture';
import { SidebarComponent } from './sidebar.component';

describe('SidebarComponent organization switcher', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_ENVIRONMENT, useValue: testEnvironment },
      ],
    });
  });

  function render(admin: boolean, showSwitcher: boolean) {
    TestBed.inject(AuthSessionStore).set(testSession(admin));
    const fixture = TestBed.createComponent(SidebarComponent);
    fixture.componentRef.setInput('showSwitcher', showSwitcher);
    fixture.detectChanges();
    return fixture;
  }

  it('lets a multi-organization user switch from the mobile drawer and closes it', () => {
    const fixture = render(true, true);
    let closed = 0;
    fixture.componentInstance.navigated.subscribe(() => closed++);
    const select = fixture.debugElement.query(
      (el) => el.componentInstance instanceof CorporateSelectComponent,
    );
    expect(select).toBeTruthy();
    (select.componentInstance as CorporateSelectComponent).select('B');
    expect(TestBed.inject(CorporateContext).current()?.id).toBe('B');
    expect(closed).toBe(1);
  });

  it('keeps the desktop sidebar without a switcher', () => {
    const fixture = render(true, false);
    expect(fixture.nativeElement.querySelector('cp-corporate-select')).toBeNull();
  });

  it('hides the switcher for a single-organization user', () => {
    const fixture = render(false, true);
    expect(fixture.nativeElement.querySelector('cp-corporate-select')).toBeNull();
  });
});
