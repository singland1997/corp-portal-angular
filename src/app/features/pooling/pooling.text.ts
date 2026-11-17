import { computed, inject, Injectable } from '@angular/core';
import { LocaleService } from '@core/i18n/locale.service';
import { formatDataSize } from '@shared/utils/data-size';
import { poolingEn, poolingTh, PoolMessageKey } from './pooling.messages';

/**
 * ข้อความและรูปแบบตัวเลข/วันที่ของหน้า Pooling ตามภาษาที่เลือก
 * ใช้ร่วมกันระหว่างหน้าหลักและ dialog (provide ไว้ที่ PoolingPage)
 */
@Injectable()
export class PoolingText {
  private readonly i18n = inject(LocaleService);

  readonly isThai = computed(() => this.i18n.locale() === 'th');
  readonly numberLocale = computed(() => (this.isThai() ? 'th-TH' : 'en-US'));

  /** ตัวเลือกสถานะ pool สำหรับ dropdown */
  readonly statusOptions = computed(() =>
    (['active', 'inactive'] as const).map((value) => ({ value, label: this.t(value) })),
  );

  t(key: PoolMessageKey): string {
    return (this.isThai() ? poolingTh : poolingEn)[key];
  }

  /** แปลง MB เป็นหน่วยที่อ่านง่าย เช่น 1,024 MB → 1 GB */
  formatData(megabytes: number | null | undefined, maxUnit: 'GB' | 'TB' = 'TB'): string {
    return formatDataSize(megabytes, this.numberLocale(), maxUnit);
  }

  /** วันที่และเวลาตามเวลาประเทศไทย */
  formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat(this.isThai() ? 'th-TH-u-ca-gregory' : 'en-GB', {
      timeZone: 'Asia/Bangkok',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  }
}
