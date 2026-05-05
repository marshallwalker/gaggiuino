import type { ChartOptions } from 'chart.js';
import { alphaHex, chartColor, hslVar } from '@/lib/chartColors';

export default function getShotChartConfig(): ChartOptions<'line'> {
  const textSecondary = hslVar('muted-foreground');
  const divider = hslVar('border');
  const temperature = chartColor('temperature');
  const pressure = chartColor('pressure');

  return {
    animation: false,
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: { color: textSecondary },
      },
    },
    datasets: { line: { pointRadius: 0 } },
    scales: {
      x: {
        axis: 'x',
        type: 'linear',
        ticks: { color: textSecondary },
        grid: { color: divider },
        min: 0,
        suggestedMax: 60,
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'left',
        min: 0,
        suggestedMax: 100,
        grid: { color: alphaHex(temperature, 0.5) },
        ticks: { color: temperature },
      },
      y2: {
        type: 'linear',
        display: true,
        position: 'right',
        min: 0,
        suggestedMax: 16,
        grid: { color: alphaHex(pressure, 0.5) },
        ticks: { color: pressure },
      },
    },
  };
}
