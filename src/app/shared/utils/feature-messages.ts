import { inject } from '@angular/core';
import { LocaleService } from '@core/i18n/locale.service';

/**
 * ข้อความเฉพาะ feature (ไม่ต้องใส่ในไฟล์ภาษากลาง) เปลี่ยนตามภาษาที่เลือกอัตโนมัติ
 *
 * ```ts
 * readonly t = featureMessages(usersEn, usersTh);
 * this.t('createUser');
 * ```
 * ต้องเรียกใน field initializer หรือ constructor (ใช้ `inject`)
 */
export function featureMessages<T extends Record<string, string>>(
  en: T,
  th: Record<keyof T, string>,
): (key: keyof T) => string {
  const i18n = inject(LocaleService);
  return (key) => (i18n.locale() === 'th' ? th : en)[key];
}
