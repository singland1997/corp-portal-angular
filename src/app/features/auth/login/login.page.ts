import { AuthSessionStore } from '@core/auth/auth-session.store';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';

import { AuthService } from '@core/auth/auth.service';
import { LocaleService } from '@core/i18n/locale.service';
import { apiErrorMessage } from '@core/api/api-error';
import { TranslationKey } from '@core/i18n/translation.models';

import { AuthLayoutComponent } from '@layout/auth-layout/auth-layout.component';

import { CardComponent } from '@shared/ui/card/card.component';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cp-login-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    MessageModule,
    CardComponent,
    FormFieldComponent,
    AuthLayoutComponent,
  ],
  templateUrl: './login.page.html',
})
export class LoginPage {
  readonly i18n = inject(LocaleService);
  readonly session = inject(AuthSessionStore);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly submitted = signal(false);
  readonly busy = signal(false);
  readonly failure = signal<TranslationKey | null>(null);
  readonly showPassword = signal(false);
  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  fieldError(field: 'email' | 'password'): string {
    const control = this.form.controls[field];
    if (!control.invalid || (!this.submitted() && !control.touched)) {
      return '';
    }

    return this.i18n.t(field === 'email' ? 'emailError' : 'passwordError');
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

  async submit(): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.submitted.set(true);
    this.failure.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    try {
      const { email, password } = this.form.getRawValue();
      if (await this.auth.signIn(email, password)) {
        this.form.controls.password.reset();
        await this.router.navigateByUrl('/dashboard', { replaceUrl: true });
      } else {
        this.failure.set('signInError');
      }
    } catch (error) {
      this.failure.set(apiErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
