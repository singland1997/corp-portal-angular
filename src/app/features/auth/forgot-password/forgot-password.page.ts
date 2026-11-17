import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LocaleService } from '@core/i18n/locale.service';

import { AuthLayoutComponent } from '@layout/auth-layout/auth-layout.component';

import { CardComponent } from '@shared/ui/card/card.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cp-forgot-password-page',
  imports: [RouterLink, CardComponent, AuthLayoutComponent],
  templateUrl: './forgot-password.page.html',
})
export class ForgotPasswordPage {
  readonly i18n = inject(LocaleService);
}
