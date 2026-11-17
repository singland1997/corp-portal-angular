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
import { CorporateContext } from '@core/corporate/corporate-context.service';
import { LocaleService } from '@core/i18n/locale.service';
import { PoolingDataService } from '../data-access/pooling-data.service';
import { DataPool, PoolDraft, PoolError } from '../pooling.models';
import { PoolingText } from '../pooling.text';

/** Dialog สร้าง pool ใหม่ หรือแก้ไข pool เดิม (ถ้าส่ง `pool` มา) */
@Component({
  selector: 'cp-pool-form-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ButtonModule, DialogModule, InputTextModule, MessageModule, SelectModule],
  templateUrl: './pool-form-dialog.component.html',
})
export class PoolFormDialogComponent {
  readonly visible = model(false);
  /** pool ที่จะแก้ไข ถ้าไม่ส่งมาคือสร้างใหม่ */
  readonly pool = input<DataPool>();
  readonly saved = output<void>();

  readonly i18n = inject(LocaleService);
  readonly text = inject(PoolingText);
  readonly data = inject(PoolingDataService);
  private readonly corporate = inject(CorporateContext);

  readonly isEdit = computed(() => !!this.pool());
  readonly corporateOptions = computed(() => [
    { label: this.corporate.name(), value: this.corporate.current()?.name ?? '' },
  ]);
  readonly error = signal<PoolError | null>(null);
  draft: PoolDraft = this.emptyDraft();

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
  }

  async save(): Promise<void> {
    const corporateId = this.corporate.current()?.id;
    try {
      const error = await this.data.savePool(this.draft, this.pool()?.id);
      // ผู้ใช้เปลี่ยนองค์กรระหว่างรอ → ไม่ต้องทำอะไรต่อ
      if (corporateId !== this.corporate.current()?.id) return;
      this.error.set(error);
      if (!error) {
        this.visible.set(false);
        this.saved.emit();
      }
    } catch {
      /* data.mutationError แสดงข้อความจาก API ในฟอร์มแล้ว */
    }
  }

  private emptyDraft(): PoolDraft {
    const pool = this.pool();
    return {
      name: pool?.name ?? '',
      corporate: pool?.corporate ?? this.corporate.current()?.name ?? '',
      status: pool?.status ?? 'active',
    };
  }
}
