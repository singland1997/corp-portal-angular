import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { AvatarModule } from 'primeng/avatar';
import { CardModule } from 'primeng/card';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cp-stat-card',
  imports: [CardModule, AvatarModule],
  host: { class: 'block min-w-0' },
  templateUrl: './stat-card.component.html',
})
export class StatCardComponent {
  readonly label = input.required<string>();
  /** `null` = unknown (rendered as an em dash, never as 0). */
  readonly value = input.required<string | number | null>();
  readonly unit = input('');
  readonly hint = input('');
  readonly icon = input('pi-chart-bar');
}
