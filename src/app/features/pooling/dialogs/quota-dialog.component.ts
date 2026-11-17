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
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { CorporateContext } from '@core/corporate/corporate-context.service';
import { LocaleService } from '@core/i18n/locale.service';
import { PoolingDataService } from '../data-access/pooling-data.service';
import {
  DataPool,
  PoolError,
  QuotaDirection,
  QuotaDraft,
  quotaError,
  toMegabytes,
} from '../pooling.models';
import { PoolingText } from '../pooling.text';

/**
 * Dialog เพิ่ม/ลดโควตา 2 ขั้น: กรอกข้อมูล (edit) → ตรวจทาน (review) → ยืนยัน
 */
@Component({
  selector: 'cp-quota-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    MessageModule,
    SelectModule,
    TextareaModule,
  ],
  templateUrl: './quota-dialog.component.html',
})
export class QuotaDialogComponent {
  readonly visible = model(false);
  readonly poolId = input.required<string>();
  readonly direction = input<QuotaDirection>('increase');
  readonly adjusted = output<void>();

  readonly i18n = inject(LocaleService);
  readonly text = inject(PoolingText);
  readonly data = inject(PoolingDataService);
  private readonly corporate = inject(CorporateContext);

  readonly units = ['MB', 'GB'];
  readonly step = signal<'edit' | 'review'>('edit');
  readonly error = signal<PoolError | null>(null);
  readonly pool = computed(() => this.data.pools().find((p) => p.id === this.poolId()));
  draft: QuotaDraft = this.emptyDraft();

  constructor() {
    // เริ่มฟอร์มใหม่ทุกครั้งที่ dialog เปิด
    effect(() => {
      if (this.visible()) untracked(() => this.reset());
    });
  }

  private reset(): void {
    this.draft = this.emptyDraft();
    this.error.set(null);
    this.data.mutationError.set(null);
    this.step.set('edit');
  }

  /** จำนวน MB ที่จะเปลี่ยน (ติดลบเมื่อลดโควตา) */
  delta(): number {
    const sign = this.draft.direction === 'increase' ? 1 : -1;
    return toMegabytes(this.draft.amount, this.draft.unit) * sign;
  }

  /** Unknown quantities stay unknown (null) in the preview. */
  remainingOf(pool: DataPool): number | null {
    return pool.quotaMb !== null && pool.usedMb !== null ? pool.quotaMb - pool.usedMb : null;
  }

  afterTotal(pool: DataPool): number | null {
    return pool.quotaMb === null ? null : pool.quotaMb + this.delta();
  }

  afterRemaining(pool: DataPool): number | null {
    const remaining = this.remainingOf(pool);
    return remaining === null ? null : remaining + this.delta();
  }

  review(): void {
    const pool = this.pool();
    const error = pool ? quotaError(pool, this.draft) : 'poolMissing';
    this.error.set(error);
    if (!error) this.step.set('review');
  }

  async confirm(): Promise<void> {
    const corporateId = this.corporate.current()?.id;
    try {
      const error = await this.data.adjustQuota(this.poolId(), this.draft);
      // ผู้ใช้เปลี่ยนองค์กรระหว่างรอ → ไม่ต้องทำอะไรต่อ
      if (corporateId !== this.corporate.current()?.id) return;
      this.error.set(error);
      if (!error) {
        this.visible.set(false);
        this.adjusted.emit();
      }
    } catch {
      /* เปิดฟอร์มค้างไว้ data.mutationError แสดงข้อความจาก API */
    }
  }

  private emptyDraft(): QuotaDraft {
    return { direction: this.direction(), amount: null, unit: 'MB', reason: '' };
  }
}
