import React, { useRef, useMemo } from 'react';
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
import { useTheme, alpha, Theme } from '@mui/material';
import getShotChartConfig from './ChartConfig';
import { Phase, PhaseTypes, Profile } from '../../models/profile';

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

function getPressureTarget(phase: Phase): [number, number] {
  if (phase.type === PhaseTypes.FLOW) {
    const restriction = phase.restriction ?? 0;
    return [restriction, restriction];
  }
  return [phase.target.start, phase.target.end ?? phase.target.start];
}

function getFlowTarget(phase: Phase): [number, number] {
  if (phase.type === PhaseTypes.PRESSURE) {
    const restriction = phase.restriction ?? 0;
    return [restriction, restriction];
  }
  return [phase.target.start, phase.target.end ?? phase.target.start];
}

interface ProfileSeries {
  labels: number[];
  pressureData: number[];
  flowData: number[];
}

function profileToDatasets(profile: Profile): ProfileSeries {
  const data: ProfileSeries = {
    labels: [],
    pressureData: [],
    flowData: [],
  };

  let phaseStartTime = 0;
  profile.phases.forEach((phase) => {
    const phaseTime = phase.stopConditions?.time ?? 5000;
    const transitionTime = phase.target.time ?? phaseTime;
    const pressureTargets = getPressureTarget(phase);
    const flowTargets = getFlowTarget(phase);

    data.labels.push(phaseStartTime / 1000);
    data.flowData.push(flowTargets[0]);
    data.pressureData.push(pressureTargets[0]);

    if (transitionTime < phaseTime) {
      data.labels.push((phaseStartTime + transitionTime) / 1000);
      data.flowData.push(flowTargets[1]);
      data.pressureData.push(pressureTargets[1]);
    }
    data.labels.push((phaseStartTime + phaseTime) / 1000);
    data.flowData.push(flowTargets[1]);
    data.pressureData.push(pressureTargets[1]);

    phaseStartTime += phaseTime + 500;
  });

  return data;
}

function mapToChartData(profile: Profile, theme: Theme): ChartData<'line'> {
  const data = profileToDatasets(profile);
  return {
    labels: data.labels,
    datasets: [
      {
        label: 'Pressure',
        data: data.pressureData,
        backgroundColor: alpha(theme.palette.pressure.main, 0.8),
        borderColor: theme.palette.pressure.main,
        tension: 0.11,
        yAxisID: 'y2',
      },
      {
        label: 'Flow',
        data: data.flowData,
        backgroundColor: alpha(theme.palette.flow.main, 0.8),
        borderColor: theme.palette.flow.main,
        tension: 0,
        yAxisID: 'y2',
      },
    ],
  };
}

interface ProfileChartProps {
  profile: Profile;
}

export default function ProfileChart({ profile }: ProfileChartProps) {
  const chartRef = useRef(null);
  const theme = useTheme();
  const config = useMemo(() => getShotChartConfig(theme), [theme]);
  const chartData = mapToChartData(profile, theme);

  return (
    <Line
      ref={chartRef}
      options={config}
      data={chartData}
    />
  );
}
