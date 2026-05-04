import { alpha, Theme } from '@mui/material';
import type { ChartOptions } from 'chart.js';

export default function getShotChartConfig(theme: Theme): ChartOptions<'line'> {
  return {
    animation: false,
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          color: theme.palette.text.secondary,
        },
      },
    },
    datasets: {
      line: {
        pointRadius: 0,
      },
    },
    scales: {
      x: {
        axis: 'x',
        type: 'linear',
        ticks: { color: theme.palette.text.secondary },
        grid: { color: theme.palette.divider },
        min: 0,
        suggestedMax: 60,
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'left',
        min: 0,
        suggestedMax: 100,
        grid: {
          color: alpha(theme.palette.temperature.main, 0.5),
        },
        ticks: {
          color: theme.palette.temperature.main,
        },
      },
      y2: {
        type: 'linear',
        display: true,
        position: 'right',
        min: 0,
        suggestedMax: 16,
        grid: {
          color: alpha(theme.palette.pressure.main, 0.5),
        },
        ticks: {
          color: theme.palette.pressure.main,
        },
      },
    },
  };
}
