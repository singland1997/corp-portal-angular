import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ButtonModule } from 'primeng/button';

import { LocaleService } from '@core/i18n/locale.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cp-language-switch',
  imports: [ButtonModule],
  templateUrl: './language-switch.component.html',
})
export class LanguageSwitchComponent {
  readonly i18n = inject(LocaleService);
}
