import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { MessageModule } from 'primeng/message';

import { LocaleService } from '@core/i18n/locale.service';

import { CardComponent } from '@shared/ui/card/card.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cp-api-docs-page',
  imports: [CardComponent, PageHeaderComponent, MessageModule],
  templateUrl: './api-docs.page.html',
})
export class ApiDocsPage {
  readonly i18n = inject(LocaleService);
  readonly sections = [
    { title: 'docAuth', body: 'docAuthBody' },
    { title: 'docTable', body: 'docTableBody' },
    { title: 'docStatus', body: 'docStatusBody' },
    { title: 'docActions', body: 'docActionsBody' },
    { title: 'docErrors', body: 'docErrorsBody' },
    { title: 'docPending', body: 'docPendingBody' },
  ] as const;
  readonly endpoints = [
    ['POST', '/auth/sessions'],
    ['GET', '/auth/me'],
    ['DELETE', '/auth/sessions/current'],
    ['GET', '/corporates/{id}'],
    ['POST', '/corporates/{id}/numbers/suspend'],
    ['GET', '/dashboard'],
    ['GET', '/pools'],
    ['GET', '/pools/members'],
    ['GET', '/pools/transactions'],
    ['GET', '/pools/inventory'],
    ['POST', '/pools'],
    ['PATCH', '/pools/{id}'],
    ['POST', '/pools/{id}/quota-adjustments'],
  ] as const;
}
