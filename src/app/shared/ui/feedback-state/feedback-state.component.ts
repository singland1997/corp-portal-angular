import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';

import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';

import { LocaleService } from '@core/i18n/locale.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cp-feedback-state',
  imports: [ButtonModule, SkeletonModule],
  templateUrl: './feedback-state.component.html',
})
export class FeedbackStateComponent {
  readonly i18n = inject(LocaleService);
  readonly kind = input<'empty' | 'loading' | 'error'>('empty');
  readonly title = input('');
  readonly description = input('');
  readonly retry = output<void>();
}
