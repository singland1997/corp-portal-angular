import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { apiErrorMessage } from '@core/api/api-error';
import { CorporateContext } from '@core/corporate/corporate-context.service';
import { LocaleService } from '@core/i18n/locale.service';
import { TranslationKey } from '@core/i18n/translation.models';
import { CardComponent } from '@shared/ui/card/card.component';
import { DataTableComponent } from '@shared/ui/data-table/data-table.component';
import { TableActionEvent, TableColumn } from '@shared/ui/data-table/data-table.models';
import { FeedbackStateComponent } from '@shared/ui/feedback-state/feedback-state.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { featureMessages } from '@shared/utils/feature-messages';
import { UsersApi } from './data-access/users-api';
import { SavedEvent, UserFormDialogComponent } from './dialogs/user-form-dialog.component';
import { InviteLinkComponent } from './invite-link/invite-link.component';
import { ROLE_LABEL, usersEn, usersTh } from './users.messages';
import { Invite, USER_ROLES, USER_STATUSES, UserRole, UserRow, UserStatus } from './users.models';

/** แถวในตาราง = ข้อมูลผู้ใช้ + ข้อความที่แปลงแล้ว */
type Row = UserRow & { no: number; corporateLabel: string; roleLabel: string };

/**
 * หน้า User management (เฉพาะ System admin)
 * รายชื่อผู้ใช้ + ค้นหา + กรองตามองค์กร/บทบาท/สถานะ + popup สร้าง/แก้ไข
 */
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
    FeedbackStateComponent,
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

  // ---- โหลดข้อมูล ----

  readonly users = signal<UserRow[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<TranslationKey | null>(null);

  // ---- ตัวกรอง (ช่องค้นหาชื่อ/อีเมลอยู่ในตาราง) ----

  readonly corporateFilter = signal<string | null>(null);
  readonly roleFilter = signal<UserRole | null>(null);
  readonly statusFilter = signal<UserStatus | null>(null);

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

  // ---- ตาราง ----

  readonly rows = computed<Row[]>(() =>
    this.users()
      .filter((user) => this.matchesFilters(user))
      .map((user, index) => ({
        ...user,
        no: index + 1,
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
    { field: 'corporateLabel', header: this.t('corporate'), sortable: true },
    { field: 'roleLabel', header: this.t('role'), sortable: true },
    { field: 'status', header: this.t('status'), type: 'status', sortable: true },
  ]);
  readonly actions = computed(() => [{ id: 'edit', label: this.t('edit'), icon: 'pi pi-pencil' }]);

  // ---- popup และข้อความแจ้ง ----

  readonly formVisible = signal(false);
  readonly editingUser = signal<UserRow | undefined>(undefined);
  readonly notice = signal<'createdWithInvite' | 'saved' | null>(null);
  /** ลิงก์ตั้งรหัสผ่านของผู้ใช้ที่เพิ่งสร้าง (แสดงครั้งเดียว) */
  readonly newInvite = signal<Invite | null>(null);

  constructor() {
    this.load();
  }

  /** โหลดรายชื่อ (โหลดซ้ำหลังบันทึกจะไม่แสดงหน้า loading ทับตาราง) */
  load(): void {
    this.loading.set(this.users().length === 0);
    this.loadError.set(null);
    this.api.list().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: (failure) => {
        this.loadError.set(apiErrorMessage(failure));
        this.loading.set(false);
      },
    });
  }

  clearFilters(): void {
    this.corporateFilter.set(null);
    this.roleFilter.set(null);
    this.statusFilter.set(null);
  }

  openCreate(): void {
    this.load();
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

  private matchesFilters(user: UserRow): boolean {
    const corporate = this.corporateFilter();
    const corporateMatches =
      corporate === null ||
      (corporate === 'platform'
        ? user.userType === 'platform'
        : user.role === 'sales'
          ? user.corporates.some((c) => c.id === corporate)
          : user.corporateId === corporate);
    return (
      corporateMatches &&
      (this.roleFilter() === null || user.role === this.roleFilter()) &&
      (this.statusFilter() === null || user.status === this.statusFilter())
    );
  }
}
