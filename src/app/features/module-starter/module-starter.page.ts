import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { LocaleService } from '@core/i18n/locale.service';
import { TranslationKey } from '@core/i18n/translation.models';

import { CardComponent } from '@shared/ui/card/card.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cp-module-starter',
  imports: [RouterLink, CardComponent, PageHeaderComponent],
  templateUrl: './module-starter.page.html',
})
export class ModuleStarterPage {
  readonly i18n = inject(LocaleService);
  private readonly route = inject(ActivatedRoute);

  get title(): TranslationKey {
    return this.route.snapshot.data['title'] as TranslationKey;
  }
}
