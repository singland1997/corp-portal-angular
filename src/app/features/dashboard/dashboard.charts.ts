import { ChartData, ChartOptions } from 'chart.js';

import { PORTAL_COLORS } from '@core/theme/portal-colors';

export function createUsageChartData(
  values: readonly (number | null)[],
  labels: string[],
  usedLabel: string,
): ChartData<'line'> {
  return {
    labels,
    datasets: [
      {
        label: usedLabel,
        data: [...values],
        backgroundColor: PORTAL_COLORS.primarySoft,
        borderColor: PORTAL_COLORS.primaryActive,
        borderWidth: 2,
        fill: true,
        tension: 0,
        pointRadius:
          values.filter((v) => v !== null).length === values.length && values.length > 1 ? 0 : 3,
        pointHitRadius: 9,
        spanGaps: false,
      },
    ],
  };
}

export const USAGE_CHART_OPTIONS: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      displayColors: false,
      padding: 12,
      callbacks: { label: (context) => `${context.dataset.label}: ${context.parsed.y} GB` },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      // Long ranges (up to a year): fewer, level labels instead of a crowded slanted row.
      ticks: { color: PORTAL_COLORS.muted, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
      border: { display: false },
    },
    y: {
      beginAtZero: true,
      grid: { color: PORTAL_COLORS.border, drawTicks: false },
      ticks: { color: PORTAL_COLORS.muted, maxTicksLimit: 5, callback: (value) => `${value} GB` },
      border: { display: false },
    },
  },
};
