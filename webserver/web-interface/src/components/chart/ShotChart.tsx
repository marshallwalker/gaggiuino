import React, {
  useEffect, useRef, useState, useMemo,
} from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  TimeScale,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
} from 'chart.js';
import { alphaHex, chartColor } from '@/lib/chartColors';
import getShotChartConfig from './ChartConfig';

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

export interface ShotChartDataPoint {
  timeInShot?: number;
  temperature?: number;
  pressure?: number;
  pumpFlow?: number;
  weightFlow?: number;
  shotWeight?: number;
  targetTemperature?: number;
  targetPumpFlow?: number;
  targetPressure?: number;
}

function mapDataPointToLabel(dataPoint: ShotChartDataPoint): number {
  if (!dataPoint.timeInShot) return 0;
  return dataPoint.timeInShot / 1000;
}

function getLabels(input: ShotChartDataPoint[]): number[] {
  return input.map(mapDataPointToLabel);
}

function getDataset<K extends keyof ShotChartDataPoint>(input: ShotChartDataPoint[], key: K): Array<ShotChartDataPoint[K]> {
  return input.map((dp) => dp[key]);
}

function mapToChartData(input: ShotChartDataPoint[]): ChartData<'line'> {
  const temp = chartColor('temperature');
  const pressure = chartColor('pressure');
  const flow = chartColor('flow');
  const weightFlow = chartColor('weight-flow');
  const weight = chartColor('weight');

  return {
    labels: getLabels(input),
    datasets: [
      {
        label: 'Temperature',
        data: getDataset(input, 'temperature') as number[],
        backgroundColor: alphaHex(temp, 0.8),
        borderColor: temp,
        tension: 0.3,
        yAxisID: 'y1',
      },
      {
        label: 'Pressure',
        data: getDataset(input, 'pressure') as number[],
        backgroundColor: alphaHex(pressure, 0.8),
        borderColor: pressure,
        tension: 0.3,
        yAxisID: 'y2',
      },
      {
        label: 'Pump Flow',
        data: getDataset(input, 'pumpFlow') as number[],
        backgroundColor: alphaHex(flow, 0.8),
        borderColor: flow,
        tension: 0.3,
        yAxisID: 'y2',
      },
      {
        label: 'Weight Flow',
        data: getDataset(input, 'weightFlow') as number[],
        backgroundColor: alphaHex(weightFlow, 0.8),
        borderColor: weightFlow,
        tension: 0.3,
        yAxisID: 'y2',
      },
      {
        label: 'Weight',
        data: getDataset(input, 'shotWeight') as number[],
        backgroundColor: alphaHex(weight, 0.8),
        borderColor: weight,
        tension: 0.3,
        yAxisID: 'y1',
      },
      {
        label: 'Target Pressure',
        data: getDataset(input, 'targetPressure') as number[],
        backgroundColor: alphaHex(pressure, 0.3),
        borderColor: alphaHex(pressure, 0.6),
        tension: 0.3,
        borderDash: [8, 4],
        yAxisID: 'y2',
      },
      {
        label: 'Target Flow',
        data: getDataset(input, 'targetPumpFlow') as number[],
        backgroundColor: alphaHex(flow, 0.3),
        borderColor: alphaHex(flow, 0.6),
        tension: 0.3,
        borderDash: [8, 4],
        yAxisID: 'y2',
      },
    ],
  };
}

function popDataFromChartData(chartData: ChartData<'line'>): void {
  chartData.labels?.shift();
  chartData.datasets.forEach((dataset) => (dataset.data as number[]).shift());
}

function newShotStarted(dataPoint: ShotChartDataPoint, chartData: ChartData<'line'>): boolean {
  const newTimeLabel = mapDataPointToLabel(dataPoint);
  const labels = (chartData.labels as number[]) ?? [];
  const previousMaxTimeLabel = labels[labels.length - 1] ?? 0;
  return previousMaxTimeLabel > newTimeLabel;
}

function addDataPointToChartData(
  chartData: ChartData<'line'>,
  dataPoint: ShotChartDataPoint | undefined,
  maxLength: number | undefined,
  chartRef: React.MutableRefObject<ChartJS<'line'> | null>,
): void {
  while (maxLength !== undefined && !Number.isNaN(maxLength) && (chartData.labels?.length ?? 0) >= maxLength) {
    popDataFromChartData(chartData);
  }

  if (!dataPoint) return;

  (chartData.labels as number[]).push(mapDataPointToLabel(dataPoint));
  (chartData.datasets[0].data as Array<number | undefined>).push(dataPoint.temperature);
  (chartData.datasets[1].data as Array<number | undefined>).push(dataPoint.pressure);
  (chartData.datasets[2].data as Array<number | undefined>).push(dataPoint.pumpFlow);
  (chartData.datasets[3].data as Array<number | undefined>).push(dataPoint.weightFlow);
  (chartData.datasets[4].data as Array<number | undefined>).push(dataPoint.shotWeight);
  (chartData.datasets[5].data as Array<number | undefined>).push(dataPoint.targetPressure);
  (chartData.datasets[6].data as Array<number | undefined>).push(dataPoint.targetPumpFlow);

  if (chartRef.current) {
    chartRef.current.data.labels = chartData.labels;
    chartData.datasets.forEach((dataset, index) => {
      chartRef.current!.data.datasets[index].data = dataset.data;
    });
    chartRef.current.update();
  }
}

interface ChartProps {
  data?: ShotChartDataPoint[];
  newDataPoint?: ShotChartDataPoint;
  maxLength?: number;
}

export default function Chart({ data, newDataPoint, maxLength }: ChartProps) {
  const chartRef = useRef<ChartJS<'line'> | null>(null);
  const config = useMemo(() => getShotChartConfig(), []);
  const [chartData, setChartData] = useState<ChartData<'line'>>(mapToChartData([]));

  if (newDataPoint && data) {
    throw new Error("Only one of 'newDataPoint' or 'data' props must be defined");
  }

  useEffect(() => {
    if (data === undefined || data === null) return;
    setChartData(mapToChartData(data));
  }, [data]);

  useEffect(() => {
    if (newDataPoint === undefined || newDataPoint === null) return;
    if (newShotStarted(newDataPoint, chartData)) {
      setChartData(mapToChartData([newDataPoint]));
    } else {
      addDataPointToChartData(chartData, newDataPoint, maxLength, chartRef);
    }
  }, [newDataPoint]);

  return (
    <Line
      ref={chartRef}
      options={config}
      data={chartData}
    />
  );
}
