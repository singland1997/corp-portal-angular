import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { Router } from '@angular/router';
import { CorporateContext } from '@core/corporate/corporate-context.service';

import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { PopoverModule } from 'primeng/popover';
import { ToolbarModule } from 'primeng/toolbar';

import { AuthService } from '@core/auth/auth.service';
import { LocaleService } from '@core/i18n/locale.service';

import { CorporateSelectComponent } from '@layout/corporate-select/corporate-select.component';
import { LanguageSwitchComponent } from '@shared/ui/language-switch/language-switch.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cp-header',
  imports: [
    AvatarModule,
    ToolbarModule,
    ButtonModule,
    PopoverModule,
    LanguageSwitchComponent,
    CorporateSelectComponent,
  ],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  readonly i18n = inject(LocaleService);
  readonly auth = inject(AuthService);
  readonly corporate = inject(CorporateContext);
  private readonly router = inject(Router);
  readonly menuToggle = output<void>();
  readonly roleLabel = computed(() => {
    const role = this.auth.user()?.role;
    return this.i18n.t(
      role === 'admin' ? 'administrator' : role === 'sales' ? 'salesUser' : 'corporateUser',
    );
  });

  async signOut(): Promise<void> {
    try {
      await this.auth.signOut();
    } catch {
      /* Local session is cleared even when the logout endpoint is unavailable. */
    } finally {
      void this.router.navigateByUrl('/login', { replaceUrl: true });
    }
  }
}
