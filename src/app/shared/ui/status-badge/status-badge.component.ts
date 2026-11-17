import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { TagModule } from 'primeng/tag';

import { LocaleService } from '@core/i18n/locale.service';

import { isPortalStatus, PortalStatus } from '@shared/models/portal-status';

import { STATUS_APPEARANCE } from './status-badge.config';

/** `null`/unmapped source status renders as "Unknown", never as a guessed portal status. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cp-status-badge',
  imports: [TagModule],
  templateUrl: './status-badge.component.html',
})
export class StatusBadgeComponent {
  readonly status = input.required<PortalStatus | string | null>();
  private readonly i18n = inject(LocaleService);
  private readonly known = computed(() => {
    const status = this.status();
    return status !== null && isPortalStatus(status) ? status : null;
  });
  readonly severity = computed(() => {
    const status = this.known();
    return status ? STATUS_APPEARANCE[status].severity : 'secondary';
  });
  readonly icon = computed(() => {
    const status = this.known();
    return status ? STATUS_APPEARANCE[status].icon : 'pi pi-question-circle';
  });
  readonly label = computed(() => {
    const status = this.status();
    if (status === null || status === '') return this.i18n.t('unknown');
    return isPortalStatus(status) ? this.i18n.t(status) : status;
  });
}
