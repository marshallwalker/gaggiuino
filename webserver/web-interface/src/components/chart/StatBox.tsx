import React, { CSSProperties, ReactNode } from 'react';
import {
  Paper, Typography, useTheme, Box, Stack, SxProps, Theme,
} from '@mui/material';
import TemperatureIcon from '@mui/icons-material/DeviceThermostat';
import TimerIcon from '@mui/icons-material/Timer';
import ScaleIcon from '@mui/icons-material/Scale';
import CompressIcon from '@mui/icons-material/Compress';
import AirIcon from '@mui/icons-material/Air';
import SportsScoreIcon from '@mui/icons-material/SportsScore';
import { formatTimeInShot } from '../../models/api';

function formatNumber(value: number | undefined, decimals = 1): string | undefined {
  return typeof value === 'number' ? value.toFixed(decimals) : undefined;
}

interface BaseBoxProps {
  sx?: SxProps<Theme>;
  style?: CSSProperties;
}

interface StatBoxProps extends BaseBoxProps {
  label: string;
  color: string;
  stat?: string | number;
  icon?: ReactNode;
  statTarget?: string | number;
  unit?: string;
}

export function StatBox({
  label, color, stat, icon, statTarget, unit, sx, style,
}: StatBoxProps) {
  const theme = useTheme();
  return (
    <Paper sx={{ border: `2px solid ${color}`, padding: theme.spacing(1), ...sx }} style={style}>
      <Stack direction="row" alignContent="stretch">
        {icon && (
          <Box display="flex" alignItems="center" color={color}>
            {icon}
          </Box>
        )}
        <Box sx={{ flexGrow: 1 }}>
          <Box>
            <Typography color={color} align="right" sx={{ fontWeight: 'bold' }}>
              {label}
            </Typography>
          </Box>
          <Box>
            <Typography color={color} align="right">
              {`${stat} ${unit || ''}`}
            </Typography>
          </Box>
          {statTarget !== undefined && statTarget !== null && Number(statTarget) >= 0 && (
            <Box display="flex" justifyContent="flex-end" alignItems="center" color={color}>
              <SportsScoreIcon fontSize="small" />
              {`${statTarget} ${unit ?? ''}`}
            </Box>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}

interface TimeStatBoxProps extends BaseBoxProps {
  timeInShot: number;
}

export function TimeStatBox({ timeInShot, sx, style }: TimeStatBoxProps) {
  const theme = useTheme();
  return (
    <StatBox
      label="Time"
      icon={<TimerIcon />}
      color={theme.palette.text.primary}
      stat={formatTimeInShot(timeInShot)}
      sx={sx}
      style={style}
    />
  );
}

interface WeightStatBoxProps extends BaseBoxProps {
  shotWeight: number;
  target?: number;
}

export function WeightStatBox({
  shotWeight, target, sx, style,
}: WeightStatBoxProps) {
  const theme = useTheme();
  return (
    <StatBox
      label="Weight"
      icon={<ScaleIcon />}
      color={theme.palette.weight.main}
      stat={formatNumber(shotWeight)}
      statTarget={formatNumber(target)}
      unit="g"
      sx={sx}
      style={style}
    />
  );
}

interface TemperatureStatBoxProps extends BaseBoxProps {
  temperature: number;
  target?: number;
}

export function TemperatureStatBox({
  temperature, target, sx, style,
}: TemperatureStatBoxProps) {
  const theme = useTheme();
  return (
    <StatBox
      label="Temp"
      icon={<TemperatureIcon />}
      color={theme.palette.temperature.main}
      stat={formatNumber(temperature)}
      statTarget={formatNumber(target)}
      unit="°C"
      sx={sx}
      style={style}
    />
  );
}

interface PumpFlowStatBoxProps extends BaseBoxProps {
  pumpFlow: number;
  target?: number;
}

export function PumpFlowStatBox({
  pumpFlow, target, sx, style,
}: PumpFlowStatBoxProps) {
  const theme = useTheme();
  return (
    <StatBox
      label="Pump Flow"
      icon={<AirIcon />}
      color={theme.palette.flow.main}
      stat={formatNumber(pumpFlow)}
      statTarget={formatNumber(target)}
      unit="ml/s"
      sx={sx}
      style={style}
    />
  );
}

interface WeightFlowStatBoxProps extends BaseBoxProps {
  flow: number;
  target?: number;
}

export function WeightFlowStatBox({
  flow, target, sx, style,
}: WeightFlowStatBoxProps) {
  const theme = useTheme();
  return (
    <StatBox
      label="Weight Flow"
      icon={<AirIcon />}
      color={theme.palette.weightFlow.main}
      stat={formatNumber(flow)}
      statTarget={formatNumber(target)}
      unit="ml/s"
      sx={sx}
      style={style}
    />
  );
}

interface PressureStatBoxProps extends BaseBoxProps {
  pressure: number;
  target?: number;
}

export function PressureStatBox({
  pressure, target, sx, style,
}: PressureStatBoxProps) {
  const theme = useTheme();
  return (
    <StatBox
      icon={<CompressIcon />}
      label="Pressure"
      color={theme.palette.pressure.main}
      stat={formatNumber(pressure)}
      statTarget={formatNumber(target)}
      unit="bar"
      sx={sx}
      style={style}
    />
  );
}
