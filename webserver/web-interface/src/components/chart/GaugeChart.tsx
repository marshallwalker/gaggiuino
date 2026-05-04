import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Title,
  ChartOptions,
  ChartData,
} from 'chart.js';
import { useTheme } from '@mui/material';
import GaugeCentralTextPlugin from './GaugeCentralTextPlugin';

ChartJS.register(ArcElement, Title, GaugeCentralTextPlugin);

export interface GaugeChartProps {
  value: number;
  maxValue?: number;
  primaryColor?: string;
  unit?: string;
  title?: string;
  maintainAspectRatio?: boolean;
}

export default function GaugeChart({
  value,
  maxValue = 100,
  primaryColor = '#6296C5',
  unit = '',
  title = '',
  maintainAspectRatio = false,
}: GaugeChartProps) {
  const theme = useTheme();

  const options = {
    cutout: '90%',
    borderWidth: 0,
    responsive: true,
    maintainAspectRatio,
    plugins: {
      center: {
        text: value.toFixed(1) + unit,
        color: primaryColor,
        maxFontSize: 50,
      },
      title: {
        display: title.length > 0,
        text: title,
      },
    },
  } as unknown as ChartOptions<'doughnut'>;

  const data: ChartData<'doughnut'> = {
    datasets: [{
      data: [value, Math.max(0, maxValue - value)],
      backgroundColor: [primaryColor, theme.palette.divider],
    }],
  };

  return <Doughnut data={data} options={options} />;
}
