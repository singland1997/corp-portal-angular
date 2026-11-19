import { MessageModule } from 'primeng/message';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthSessionStore } from '@core/auth/auth-session.store';

import { DrawerModule } from 'primeng/drawer';

import { LocaleService } from '@core/i18n/locale.service';

import { FooterComponent } from '@layout/footer/footer.component';
import { HeaderComponent } from '@layout/header/header.component';
import { SidebarComponent } from '@layout/sidebar/sidebar.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cp-app-shell',
  imports: [
    MessageModule,
    RouterOutlet,
    DrawerModule,
    SidebarComponent,
    HeaderComponent,
    FooterComponent,
  ],
  templateUrl: './app-shell.component.html',
})
export class AppShellComponent {
  readonly session = inject(AuthSessionStore);
  readonly i18n = inject(LocaleService);
  readonly mobileMenu = signal(false);
  constructor() {
    const session = inject(AuthSessionStore),
      router = inject(Router);
    effect(() => {
      if (!session.user())
        void router.navigate(['/login'], {
          replaceUrl: true,
        });
    });
  }
}
