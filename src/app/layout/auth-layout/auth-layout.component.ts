import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LocaleService } from '@core/i18n/locale.service';

import { LanguageSwitchComponent } from '@shared/ui/language-switch/language-switch.component';
import { AppVersionComponent } from '@shared/ui/app-version/app-version.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cp-auth-layout',
  imports: [RouterLink, LanguageSwitchComponent, AppVersionComponent],
  templateUrl: './auth-layout.component.html',
})
export class AuthLayoutComponent {
  readonly compact = input(false);
  readonly i18n = inject(LocaleService);
}
