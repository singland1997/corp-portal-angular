import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { MenuItem } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';

import { LocaleService } from '@core/i18n/locale.service';
import { CorporateContext } from '@core/corporate/corporate-context.service';
import { AuthSessionStore } from '@core/auth/auth-session.store';
import { canSee, resourceNavigation, workspaceNavigation } from '@core/routing/portal-navigation';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cp-sidebar',
  imports: [RouterLink, RouterLinkActive, MenuModule, AvatarModule],
  host: { class: 'block h-full' },
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  readonly i18n = inject(LocaleService);
  readonly corporate = inject(CorporateContext);
  private readonly auth = inject(AuthSessionStore);
  readonly navigated = output<void>();
  readonly groups = [
    { title: 'workspace' as const, items: workspaceNavigation },
    { title: 'resources' as const, items: resourceNavigation },
  ];
  readonly menuItems = computed<MenuItem[]>(() =>
    this.groups.map((group) => ({
      label: this.i18n.t(group.title),
      items: group.items
        .filter((item) => canSee(item, this.auth.user()?.role))
        .map((item) => ({
          label: this.i18n.t(item.label),
          routerLink: item.path,
          icon: 'pi ' + item.icon,
        })),
    })),
  );
}
