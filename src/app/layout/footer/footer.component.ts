import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LocaleService } from '@core/i18n/locale.service';
import { AppVersionComponent } from '@shared/ui/app-version/app-version.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cp-footer',
  imports: [RouterLink, AppVersionComponent],
  templateUrl: './footer.component.html',
})
export class FooterComponent {
  readonly i18n = inject(LocaleService);
  readonly year = new Date().getFullYear();
}
