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
        borderColor: PORTAL_COLORS.primaryActive,
        backgroundColor: `${PORTAL_COLORS.primarySoft}80`,
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointBackgroundColor: PORTAL_COLORS.primaryHover,
        borderWidth: 2,
        // Unknown days are gaps, not zero.
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
      callbacks: { label: (context) => `${context.dataset.label}: ${context.parsed.y} GB` },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: PORTAL_COLORS.muted },
      border: { display: false },
    },
    y: {
      beginAtZero: true,
      grid: { color: PORTAL_COLORS.subtle },
      ticks: { color: PORTAL_COLORS.muted, maxTicksLimit: 5, callback: (value) => `${value} GB` },
      border: { display: false },
    },
  },
};
