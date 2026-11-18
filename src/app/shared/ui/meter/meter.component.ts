import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * One ratio against its limit (e.g. quota used of total) as a same-ramp track + fill.
 * Unknown values render an empty track and "—", never 0 %. Use beyond the limit fills the
 * track, turns critical and says so in text (color is never the only signal).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cp-meter',
  host: { class: 'block min-w-0' },
  templateUrl: './meter.component.html',
})
export class MeterComponent {
  readonly value = input.required<number | null>();
  readonly max = input.required<number | null>();
  /** Accessible name, e.g. "DATA used". */
  readonly label = input.required<string>();
  /** Text after the figures, e.g. "12 GB of 50 GB". */
  readonly caption = input('');
  readonly overLabel = input('Over limit');
  readonly locale = input('en-US');

  readonly ratio = computed(() => {
    const value = this.value();
    const max = this.max();
    return value === null || max === null || max <= 0 ? null : value / max;
  });
  readonly over = computed(() => (this.ratio() ?? 0) > 1);
  readonly width = computed(() => `${Math.min(1, Math.max(0, this.ratio() ?? 0)) * 100}%`);
  readonly percent = computed(() => {
    const ratio = this.ratio();
    return ratio === null
      ? '—'
      : new Intl.NumberFormat(this.locale(), {
          style: 'percent',
          maximumFractionDigits: ratio < 0.1 ? 1 : 0,
        }).format(ratio);
  });
}
