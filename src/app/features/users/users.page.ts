import { readResource } from '@core/api/read-resource';
import { INITIAL_QUERY, pageParams, sameTableQuery } from '@core/api/pagination';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { CorporateContext } from '@core/corporate/corporate-context.service';
import { LocaleService } from '@core/i18n/locale.service';
import { CardComponent } from '@shared/ui/card/card.component';
import { DataTableComponent } from '@shared/ui/data-table/data-table.component';
import { TableActionEvent, TableColumn, TableQuery } from '@shared/ui/data-table/data-table.models';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { featureMessages } from '@shared/utils/feature-messages';
import { UsersApi } from './data-access/users-api';
import { SavedEvent, UserFormDialogComponent } from './dialogs/user-form-dialog.component';
import { InviteLinkComponent } from './invite-link/invite-link.component';
import { ROLE_LABEL, usersEn, usersTh } from './users.messages';
import { Invite, USER_ROLES, USER_STATUSES, UserRole, UserRow, UserStatus } from './users.models';

type Row = UserRow & { no: number; corporateLabel: string; roleLabel: string };

@Component({
  selector: 'cp-users-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ButtonModule,
    MessageModule,
    SelectModule,
    CardComponent,
    DataTableComponent,
    PageHeaderComponent,
    UserFormDialogComponent,
    InviteLinkComponent,
  ],
  templateUrl: './users.page.html',
})
export class UsersPage {
  readonly i18n = inject(LocaleService);
  readonly t = featureMessages(usersEn, usersTh);
  private readonly api = inject(UsersApi);
  private readonly corporate = inject(CorporateContext);

  readonly corporateFilter = signal<string | null>(null);
  readonly roleFilter = signal<UserRole | null>(null);
  readonly statusFilter = signal<UserStatus | null>(null);
  readonly table = viewChild(DataTableComponent);
  readonly query = signal<TableQuery>(INITIAL_QUERY, { equal: sameTableQuery });
  readonly resource = readResource(
    () => ({
      ...pageParams(this.query(), 'name'),
      ...(this.corporateFilter() ? { corporate: this.corporateFilter()! } : {}),
      ...(this.roleFilter() ? { role: this.roleFilter()! } : {}),
      ...(this.statusFilter() ? { status: this.statusFilter()! } : {}),
    }),
    (params) => this.api.page(params),
  );
  readonly users = computed(() => this.resource.data()?.items ?? []);
  readonly owners = readResource(
    () => true,
    () => this.api.assignments(),
  );

  readonly corporateOptions = computed(() => [
    { value: null, label: this.t('allCorporates') },
    { value: 'platform', label: this.t('platform') },
    ...this.corporate.options(),
  ]);
  readonly roleOptions = computed(() => [
    { value: null, label: this.t('allRoles') },
    ...USER_ROLES.map((value) => ({ value, label: this.t(ROLE_LABEL[value]) })),
  ]);
  readonly statusOptions = computed(() => [
    { value: null, label: this.t('allStatuses') },
    ...USER_STATUSES.map((value) => ({ value, label: this.t(value) })),
  ]);

  readonly rows = computed<Row[]>(() =>
    this.users().map((user, index) => ({
      ...user,
      no: (this.query().page - 1) * this.query().pageSize + index + 1,
      corporateLabel:
        user.role === 'sales'
          ? user.corporates
              .map((c) => (this.i18n.locale() === 'th' ? (c.nameTh ?? c.name) : c.name))
              .join(', ')
          : (user.corporateName ?? this.t('platformScope')),
      roleLabel: this.t(ROLE_LABEL[user.role]),
    })),
  );
  readonly columns = computed<TableColumn<Row>[]>(() => [
    { field: 'no', header: this.t('no'), width: '4rem' },
    { field: 'name', header: this.t('name'), sortable: true },
    { field: 'email', header: this.t('email'), sortable: true },
    { field: 'corporateLabel', header: this.t('corporate') },
    { field: 'roleLabel', header: this.t('role') },
    { field: 'status', header: this.t('status'), type: 'status', sortable: true },
  ]);
  readonly actions = computed(() => [{ id: 'edit', label: this.t('edit'), icon: 'pi pi-pencil' }]);

  readonly formVisible = signal(false);
  readonly editingUser = signal<UserRow | undefined>(undefined);
  readonly notice = signal<'createdWithInvite' | 'saved' | null>(null);
  readonly newInvite = signal<Invite | null>(null);

  constructor() {
    effect(() => {
      this.corporateFilter();
      this.roleFilter();
      this.statusFilter();
      untracked(() => {
        this.query.update((query) => ({ ...query, page: 1 }));
        this.table()?.reset();
      });
    });
  }

  load(): void {
    this.resource.reload();
    this.owners.reload();
  }

  clearFilters(): void {
    this.corporateFilter.set(null);
    this.roleFilter.set(null);
    this.statusFilter.set(null);
  }

  openCreate(): void {
    this.owners.reload();
    this.editingUser.set(undefined);
    this.notice.set(null);
    this.newInvite.set(null);
    this.formVisible.set(true);
  }

  onRowAction(event: TableActionEvent<Row>): void {
    if (event.action !== 'edit') return;
    this.load();
    this.editingUser.set(this.users().find((u) => u.id === event.row.id));
    this.notice.set(null);
    this.newInvite.set(null);
    this.formVisible.set(true);
  }

  onSaved(event: SavedEvent): void {
    this.notice.set(event.kind === 'created' ? 'createdWithInvite' : 'saved');
    this.newInvite.set(event.invite ?? null);
    this.load();
  }
}
