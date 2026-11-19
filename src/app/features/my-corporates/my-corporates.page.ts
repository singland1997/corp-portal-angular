import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { readResource } from '@core/api/read-resource';
import { AuthApi } from '@core/auth/auth-api.service';
import { AuthSessionStore } from '@core/auth/auth-session.store';
import { LocaleService } from '@core/i18n/locale.service';
import { CardComponent } from '@shared/ui/card/card.component';
import { FeedbackStateComponent } from '@shared/ui/feedback-state/feedback-state.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { featureMessages } from '@shared/utils/feature-messages';
import { CorporateChoice, MyCorporatesApi } from './my-corporates-api';
import { myCorporatesEn, myCorporatesTh } from './my-corporates.messages';

@Component({
  selector: 'cp-my-corporates-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ButtonModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    MessageModule,
    CardComponent,
    FeedbackStateComponent,
    PageHeaderComponent,
  ],
  templateUrl: './my-corporates.page.html',
})
export class MyCorporatesPage {
  readonly i18n = inject(LocaleService);
  readonly t = featureMessages(myCorporatesEn, myCorporatesTh);
  private readonly api = inject(MyCorporatesApi);
  private readonly authApi = inject(AuthApi);
  private readonly session = inject(AuthSessionStore);

  readonly choices = readResource(
    () => ({}),
    () => this.api.list(),
  );
  readonly search = signal('');
  readonly busyId = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  readonly mine = computed(() => this.choices.data()?.mine ?? []);
  readonly available = computed(() => {
    const term = this.search().trim().toLowerCase();
    return (this.choices.data()?.available ?? []).filter(
      (c) => !term || [c.name, c.nameTh, c.code].some((v) => v?.toLowerCase().includes(term)),
    );
  });
  readonly onlyOne = computed(() => this.mine().length <= 1);

  name(corporate: CorporateChoice): string {
    return (this.i18n.locale() === 'th' && corporate.nameTh) || corporate.name;
  }

  claim(corporate: CorporateChoice): Promise<void> {
    return this.change(corporate, () => this.api.claim(corporate.id));
  }

  release(corporate: CorporateChoice): Promise<void> {
    return this.change(corporate, () => this.api.release(corporate.id));
  }

  private async change(
    corporate: CorporateChoice,
    request: () => ReturnType<MyCorporatesApi['claim']>,
  ): Promise<void> {
    this.busyId.set(corporate.id);
    this.error.set(null);
    try {
      await firstValueFrom(request());
      this.session.updateUser(await firstValueFrom(this.authApi.me()));
    } catch (failure) {
      this.error.set(this.failureText(failure));
    } finally {
      this.busyId.set(null);
      this.choices.reload();
    }
  }

  private failureText(failure: unknown): string {
    const code = failure instanceof HttpErrorResponse ? failure.error?.error?.code : null;
    if (code === 'CORPORATE_TAKEN') return this.t('taken');
    if (code === 'LAST_CORPORATE') return this.t('lastOne');
    return this.t('failed');
  }
}
