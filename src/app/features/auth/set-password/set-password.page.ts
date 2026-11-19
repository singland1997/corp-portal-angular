import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { firstValueFrom } from 'rxjs';
import { apiErrorMessage } from '@core/api/api-error';
import { AuthApi } from '@core/auth/auth-api.service';
import { LocaleService } from '@core/i18n/locale.service';
import { AuthLayoutComponent } from '@layout/auth-layout/auth-layout.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';
import { featureMessages } from '@shared/utils/feature-messages';
import { setPasswordEn, setPasswordTh } from './set-password.messages';

const MIN_PASSWORD_CHARS = 12;

@Component({
  selector: 'cp-set-password-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    MessageModule,
    AuthLayoutComponent,
    CardComponent,
    FormFieldComponent,
  ],
  templateUrl: './set-password.page.html',
})
export class SetPasswordPage {
  readonly t = featureMessages(setPasswordEn, setPasswordTh);
  private readonly i18n = inject(LocaleService);
  private readonly api = inject(AuthApi);

  readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token') ?? '';

  readonly password = signal('');
  readonly confirm = signal('');
  readonly showPassword = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly done = signal(false);

  async submit(): Promise<void> {
    const problem = this.validate();
    this.error.set(problem);
    if (problem || this.busy()) return;

    this.busy.set(true);
    try {
      await firstValueFrom(this.api.setupPassword(this.token, this.password()));
      this.done.set(true);
    } catch (failure) {
      this.error.set(this.errorText(failure));
    } finally {
      this.busy.set(false);
    }
  }

  private validate(): string | null {
    if (!this.token) return this.t('missingLink');
    if ([...this.password()].length < MIN_PASSWORD_CHARS || !this.password().trim()) {
      return this.t('tooShort');
    }
    if (this.password() !== this.confirm()) return this.t('mismatch');
    return null;
  }

  private errorText(failure: unknown): string {
    if (failure instanceof HttpErrorResponse) {
      const code = failure.error?.error?.code;
      if (code === 'INVITE_INVALID') return this.t('invalidLink');
      if (code === 'WEAK_PASSWORD') return this.t('tooShort');
      if (failure.status === 429) return this.t('tooManyAttempts');
    }
    return this.i18n.t(apiErrorMessage(failure));
  }
}
