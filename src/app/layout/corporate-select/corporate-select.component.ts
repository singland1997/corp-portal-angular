import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { SelectModule } from 'primeng/select';

import { CorporateContext } from '@core/corporate/corporate-context.service';
import { LocaleService } from '@core/i18n/locale.service';

/** Organization switcher shared by the header, the account popover and the mobile drawer. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cp-corporate-select',
  imports: [FormsModule, SelectModule],
  template: `
    <p-select
      [options]="corporate.options()"
      optionLabel="label"
      optionValue="value"
      [ngModel]="corporate.current()?.id"
      (ngModelChange)="select($event)"
      [ariaLabel]="i18n.t('selectCorporate')"
      [inputId]="inputId()"
      appendTo="body"
      [fluid]="fluid()"
    />
  `,
})
export class CorporateSelectComponent {
  readonly i18n = inject(LocaleService);
  readonly corporate = inject(CorporateContext);
  private readonly router = inject(Router);
  readonly fluid = input(false);
  readonly inputId = input<string | undefined>(undefined);
  readonly selected = output<string>();

  select(id: string): void {
    this.corporate.select(id);
    void this.router.navigate([], {
      queryParams: { pool: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.selected.emit(id);
  }
}
