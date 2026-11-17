import { ChangeDetectionStrategy, Component, inject, input, model, output } from '@angular/core';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

import { LocaleService } from '@core/i18n/locale.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cp-confirm-dialog',
  imports: [DialogModule, ButtonModule],
  templateUrl: './confirm-dialog.component.html',
})
export class ConfirmDialogComponent {
  readonly i18n = inject(LocaleService);
  readonly visible = model(false);
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('');
  readonly danger = input(false);
  readonly busy = input(false);
  readonly confirmed = output<void>();
}
