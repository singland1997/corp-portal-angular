import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { MultiSelectModule } from 'primeng/multiselect';
import { firstValueFrom } from 'rxjs';
import { apiErrorMessage } from '@core/api/api-error';
import { CorporateContext } from '@core/corporate/corporate-context.service';
import { LocaleService } from '@core/i18n/locale.service';
import { featureMessages } from '@shared/utils/feature-messages';
import { UsersApi } from '../data-access/users-api';
import { ROLE_LABEL, usersEn, usersTh } from '../users.messages';
import { InviteLinkComponent } from '../invite-link/invite-link.component';
import {
  Invite,
  PLATFORM_ROLES,
  UserDraft,
  UserRow,
  SalesAssignment,
  USER_STATUSES,
} from '../users.models';

/** created มีลิงก์ตั้งรหัสผ่านมาด้วย */
export interface SavedEvent {
  kind: 'created' | 'saved';
  invite?: Invite;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Popup สร้าง/แก้ไขผู้ใช้ (ส่ง `user` มา = แก้ไข)
 *
 * - ประเภท Corporate → เลือกองค์กร (บทบาทเป็น Corp admin อัตโนมัติ)
 * - ประเภท Platform  → เลือกบทบาท System admin หรือ Sales
 */
@Component({
  selector: 'cp-user-form-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    SelectButtonModule,
    MultiSelectModule,
    InviteLinkComponent,
  ],
  templateUrl: './user-form-dialog.component.html',
})
export class UserFormDialogComponent {
  readonly visible = model(false);
  readonly user = input<UserRow>();
  readonly assignments = input<readonly SalesAssignment[]>([]);
  readonly assignmentsReady = input(true);
  readonly saved = output<SavedEvent>();
  readonly refreshUsers = output<void>();

  readonly t = featureMessages(usersEn, usersTh);
  private readonly i18n = inject(LocaleService);
  private readonly api = inject(UsersApi);
  readonly corporate = inject(CorporateContext);

  readonly isEdit = computed(() => !!this.user());
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  /** ลิงก์ที่เพิ่งออกใหม่ในหน้าแก้ไข */
  readonly invite = signal<Invite | null>(null);
  draft: UserDraft = this.emptyDraft();

  readonly typeOptions = computed(() => [
    { value: 'corporate', label: this.t('corporateType') },
    { value: 'platform', label: this.t('platform') },
  ]);
  readonly roleOptions = computed(() =>
    PLATFORM_ROLES.map((value) => ({ value, label: this.t(ROLE_LABEL[value]) })),
  );
  readonly statusOptions = computed(() =>
    USER_STATUSES.map((value) => ({ value, label: this.t(value) })),
  );
  readonly salesCorporateOptions = computed(() =>
    this.corporate.options().map((corporate) => {
      const owner = this.assignments().find(
        (assignment) =>
          assignment.userId !== this.user()?.id && assignment.corporateId === corporate.value,
      );
      return {
        ...corporate,
        label: owner
          ? `${corporate.label} — ${this.t('assignedTo')} ${owner.name}`
          : corporate.label,
        disabled: !!owner,
      };
    }),
  );

  constructor() {
    // เริ่มฟอร์มใหม่ทุกครั้งที่ popup เปิด
    effect(() => {
      if (this.visible()) untracked(() => this.reset());
    });
  }

  async submit(): Promise<void> {
    if (!this.assignmentsReady()) return;
    const problem = this.validate();
    this.error.set(problem);
    if (problem || this.busy()) return;

    this.busy.set(true);
    try {
      const user = this.user();
      if (user) {
        await firstValueFrom(this.api.update(user.id, this.updateBody()));
        this.saved.emit({ kind: 'saved' });
      } else {
        const created = await firstValueFrom(this.api.create(this.createBody()));
        const { inviteToken, inviteExpiresAt } = created;
        this.saved.emit({ kind: 'created', invite: { inviteToken, inviteExpiresAt } });
      }
      this.visible.set(false);
    } catch (failure) {
      this.error.set(this.errorText(failure));
    } finally {
      this.busy.set(false);
    }
  }

  /** ออกลิงก์ตั้งรหัสผ่านใหม่ให้ผู้ใช้ที่ยังไม่ได้ตั้งรหัสผ่าน */
  async createInvite(): Promise<void> {
    const user = this.user();
    if (!user || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      this.invite.set(await firstValueFrom(this.api.invite(user.id)));
    } catch (failure) {
      this.error.set(this.errorText(failure));
    } finally {
      this.busy.set(false);
    }
  }

  private reset(): void {
    this.draft = this.emptyDraft();
    this.error.set(null);
    this.invite.set(null);
  }

  private emptyDraft(): UserDraft {
    const user = this.user();
    return {
      userType: user?.userType ?? 'corporate',
      corporateId: user?.corporateId ?? this.corporate.current()?.id ?? '',
      corporateIds: user?.role === 'sales' ? user.corporates.map((c) => c.id) : [],
      fullName: user?.name ?? '',
      email: user?.email ?? '',
      role: user?.userType === 'platform' ? user.role : 'admin',
      status: user?.status ?? 'pending',
    };
  }

  /** คืนข้อความ error หรือ null ถ้าข้อมูลครบ */
  private validate(): string | null {
    const d = this.draft;
    const missing =
      !d.fullName.trim() ||
      !d.email.trim() ||
      (d.userType === 'corporate' && !d.corporateId) ||
      (d.userType === 'platform' && !d.role);
    if (missing) return this.t('required');
    if (d.userType === 'platform' && d.role === 'sales') {
      if (!d.corporateIds.length) return this.t('salesCorporateRequired');
      const allowed = this.salesCorporateOptions().filter((option) => !option.disabled);
      if (d.corporateIds.some((id) => !allowed.some((option) => option.value === id))) {
        return this.t('corporateAssigned');
      }
    }
    if (!this.isEdit() && !EMAIL_PATTERN.test(d.email.trim())) return this.t('invalidEmail');
    return null;
  }

  private createBody() {
    const d = this.draft;
    return d.userType === 'corporate'
      ? { userType: d.userType, corporateId: d.corporateId, fullName: d.fullName, email: d.email }
      : {
          userType: d.userType,
          role: d.role,
          fullName: d.fullName,
          email: d.email,
          ...(d.role === 'sales' ? { corporateIds: d.corporateIds } : {}),
        };
  }

  private updateBody() {
    const d = this.draft;
    return d.userType === 'corporate'
      ? { fullName: d.fullName, corporateId: d.corporateId, status: d.status }
      : {
          fullName: d.fullName,
          role: d.role,
          status: d.status,
          ...(d.role === 'sales' ? { corporateIds: d.corporateIds } : {}),
        };
  }

  private errorText(failure: unknown): string {
    if (failure instanceof HttpErrorResponse) {
      const code = failure.error?.error?.code;
      if (code === 'CORPORATE_ALREADY_ASSIGNED') {
        this.refreshUsers.emit();
        return this.t('corporateAssigned');
      }
      if (code === 'PASSWORD_NOT_SET') return this.t('noPasswordHint');
      if (code === 'SELF_CHANGE') return this.t('selfChange');
      if (failure.status === 409) return this.t('emailInUse');
      if (failure.status === 400) return this.t('invalidInput');
    }
    return this.i18n.t(apiErrorMessage(failure));
  }
}
