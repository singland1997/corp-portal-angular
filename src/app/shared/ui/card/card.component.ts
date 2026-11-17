import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { CardModule } from 'primeng/card';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cp-card',
  imports: [CardModule],
  host: { class: 'block min-w-0' },
  templateUrl: './card.component.html',
})
export class CardComponent {
  readonly title = input('');
  readonly subtitle = input('');
  readonly flush = input(false);
}
