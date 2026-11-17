import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { LocaleService } from '@core/i18n/locale.service';
import { LoginPage } from './login.page';

describe('Login destination', () => {
  it('always opens dashboard after successful login', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { signIn: vi.fn().mockResolvedValue(true) } },
        { provide: LocaleService, useValue: {} },
      ],
    });
    TestBed.overrideComponent(LoginPage, { set: { template: '', imports: [] } });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const page = TestBed.createComponent(LoginPage).componentInstance;
    page.form.setValue({ email: 'test@example.test', password: 'test-password' });
    await page.submit();
    expect(navigate).toHaveBeenCalledWith('/dashboard', { replaceUrl: true });
    expect(page.form.controls.password.value).toBe('');
  });
});
