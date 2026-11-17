import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { LocaleService } from '@core/i18n/locale.service';
import { featureMessages } from '@shared/utils/feature-messages';
import { usersEn, usersTh } from '../users.messages';
import { Invite } from '../users.models';

/** แสดงลิงก์ตั้งรหัสผ่าน + ปุ่มคัดลอก ให้ admin ส่งต่อให้ผู้ใช้ใหม่ */
@Component({
  selector: 'cp-invite-link',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, InputTextModule],
  template: `
    <div class="grid gap-2">
      <label [for]="inputId" class="text-sm font-medium">{{ t('inviteLink') }}</label>
      <div class="flex gap-2">
        <input
          pInputText
          [id]="inputId"
          class="min-w-0 flex-1"
          [value]="url()"
          readonly
          (focus)="$any($event.target).select()"
        />
        <p-button
          [icon]="copied() ? 'pi pi-check' : 'pi pi-copy'"
          [label]="t(copied() ? 'copied' : 'copy')"
          severity="secondary"
          [outlined]="true"
          (onClick)="copy()"
        />
      </div>
      <p class="text-xs text-muted">{{ t('inviteHint') }} {{ expires() }}</p>
    </div>
  `,
})
export class InviteLinkComponent {
  readonly invite = input.required<Invite>();

  readonly t = featureMessages(usersEn, usersTh);
  private readonly i18n = inject(LocaleService);
  private readonly document = inject(DOCUMENT);
  readonly inputId = `invite-link-${Math.random().toString(36).slice(2, 8)}`;
  readonly copied = signal(false);

  /** ลิงก์เต็มไปหน้า /set-password ของเว็บนี้ */
  readonly url = computed(
    () =>
      `${this.document.location.origin}/set-password?token=${encodeURIComponent(this.invite().inviteToken)}`,
  );
  readonly expires = computed(() =>
    new Intl.DateTimeFormat(this.i18n.locale() === 'th' ? 'th-TH-u-ca-gregory' : 'en-GB', {
      timeZone: 'Asia/Bangkok',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(this.invite().inviteExpiresAt * 1000)),
  );

  async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.url());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      /* เบราว์เซอร์ไม่อนุญาตคัดลอก ผู้ใช้เลือกข้อความในช่องแล้วคัดลอกเองได้ */
    }
  }
}
