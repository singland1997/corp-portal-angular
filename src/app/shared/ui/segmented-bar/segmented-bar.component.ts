import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** One part of a whole. `pattern` adds a stripe texture (never color alone, e.g. "unknown"). */
export interface BarSegment {
  key: string;
  label: string;
  value: number;
  color: string;
  /** Text color on the block (dark on light fills such as yellow). */
  ink?: string;
  pattern?: boolean;
}

/**
 * Part-to-whole bar (plain HTML, no canvas).
 * - `tall`: alone in a card; share printed on each block where it fits, legend with counts.
 * - `thin`: inside a table row next to its own figures; no text, one legend elsewhere.
 * Each block has a hover/focus tooltip and an accessible label; empty parts are skipped.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cp-segmented-bar',
  host: { class: 'block min-w-0' },
  templateUrl: './segmented-bar.component.html',
})
export class SegmentedBarComponent {
  readonly segments = input.required<readonly BarSegment[]>();
  readonly variant = input<'tall' | 'thin'>('tall');
  readonly legend = input(true);
  /** Accessible summary of the whole bar, e.g. "Numbers by status". */
  readonly label = input.required<string>();
  readonly locale = input('en-US');

  readonly total = computed(() =>
    this.segments().reduce((sum, segment) => sum + Math.max(0, segment.value), 0),
  );
  readonly visible = computed(() => {
    const total = this.total();
    return total > 0
      ? this.segments()
          .filter((segment) => segment.value > 0)
          .map((segment) => ({ ...segment, share: segment.value / total }))
      : [];
  });

  percent(share: number): string {
    return new Intl.NumberFormat(this.locale(), {
      style: 'percent',
      maximumFractionDigits: share < 0.1 ? 1 : 0,
    }).format(share);
  }

  count(value: number): string {
    return value.toLocaleString(this.locale());
  }

  fill(segment: BarSegment): string {
    return segment.pattern
      ? `repeating-linear-gradient(45deg, ${segment.color} 0 4px, #ffffff 4px 7px)`
      : segment.color;
  }
}
