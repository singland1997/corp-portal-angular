import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ChartData, ChartOptions } from 'chart.js';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';

type PortalChartType = 'line' | 'bar' | 'doughnut';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cp-chart',
  host: { class: 'block min-w-0' },
  imports: [BaseChartDirective],
  providers: [provideCharts(withDefaultRegisterables())],
  templateUrl: './chart.component.html',
})
export class ChartComponent<TType extends PortalChartType = 'line'> {
  private readonly document = inject(DOCUMENT);
  readonly type = input.required<TType>();
  readonly data = input.required<ChartData<TType>>();
  readonly label = input.required<string>();
  readonly height = input(260);
  readonly options = input.required<ChartOptions<TType>>();

  // Chart.js resolves these callbacks when it lays out/resizes the canvas.
  // Build new input options instead of mutating Chart.js's resolved option proxies.
  private readonly font = () => {
    const size = this.document.defaultView?.getComputedStyle(
      this.document.documentElement,
    ).fontSize;
    return { size: (size ? parseFloat(size) : 16) * 0.75 };
  };
  readonly responsiveOptions = computed(() => {
    const options = this.options() as ChartOptions<PortalChartType>;
    const scales =
      options.scales &&
      Object.fromEntries(
        Object.entries(options.scales).map(([id, scale]) => [
          id,
          {
            ...scale,
            ticks: { ...scale?.ticks, font: this.font },
          },
        ]),
      );
    return {
      ...options,
      scales,
      plugins: {
        ...options.plugins,
        tooltip: { ...options.plugins?.tooltip, bodyFont: this.font, titleFont: this.font },
      },
    } as ChartOptions<TType>;
  });
}
