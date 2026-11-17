import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { apiErrorMessage } from '@core/api/api-error';
import { LocaleService } from '@core/i18n/locale.service';
import { TranslationKey } from '@core/i18n/translation.models';
import { CardComponent } from '@shared/ui/card/card.component';
import { DataTableComponent } from '@shared/ui/data-table/data-table.component';
import { TableActionEvent, TableColumn } from '@shared/ui/data-table/data-table.models';
import { FeedbackStateComponent } from '@shared/ui/feedback-state/feedback-state.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { featureMessages } from '@shared/utils/feature-messages';
import { RolesApi } from './data-access/roles-api';
import { rolesEn, rolesTh } from './roles.messages';
import { RoleDefinition } from './roles.models';

type RoleRow = RoleDefinition & { label: string; permissionCount: number };

@Component({
  selector: 'cp-roles-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DialogModule,
    CardComponent,
    DataTableComponent,
    FeedbackStateComponent,
    PageHeaderComponent,
  ],
  templateUrl: './roles.page.html',
})
export class RolesPage {
  readonly i18n = inject(LocaleService);
  readonly t = featureMessages(rolesEn, rolesTh);
  private readonly api = inject(RolesApi);
  readonly roles = signal<RoleDefinition[]>([]);
  readonly loading = signal(true);
  readonly error = signal<TranslationKey | null>(null);
  readonly selected = signal<RoleRow | null>(null);
  private readonly revision = signal(0);
  readonly rows = computed<RoleRow[]>(() =>
    this.roles().map((role) => ({
      ...role,
      label: this.roleLabel(role),
      description: this.roleDescription(role),
      permissionCount: role.permissions.length,
    })),
  );
  readonly columns = computed<TableColumn<RoleRow>[]>(() => [
    { field: 'label', header: this.t('name'), sortable: true },
    { field: 'description', header: this.t('description') },
    { field: 'permissionCount', header: this.t('permissionCount'), sortable: true },
  ]);
  readonly actions = computed(() => [
    { id: 'details', label: this.i18n.t('details'), icon: 'pi pi-eye' },
  ]);

  constructor() {
    effect((onCleanup) => {
      this.revision();
      this.roles.set([]);
      this.selected.set(null);
      this.error.set(null);
      this.loading.set(true);
      const subscription = this.api.list().subscribe({
        next: (roles) => {
          this.roles.set(roles);
          this.loading.set(false);
        },
        error: (failure) => {
          this.error.set(apiErrorMessage(failure));
          this.loading.set(false);
        },
      });
      onCleanup(() => subscription.unsubscribe());
    });
  }
  reload(): void {
    this.revision.update((value) => value + 1);
  }
  openDetails(event: TableActionEvent<RoleRow>): void {
    if (event.action === 'details') this.selected.set(event.row);
  }
  roleDescription(role: RoleDefinition): string {
    return role.id === 'admin' || role.id === 'sales' || role.id === 'corporate'
      ? this.t(`${role.id}Description`)
      : role.description;
  }
  roleLabel(role: RoleDefinition): string {
    return role.id === 'admin' || role.id === 'sales' || role.id === 'corporate'
      ? this.t(role.id)
      : role.name;
  }
}
