import React, { ReactNode } from 'react';
import {
  Thermometer, Timer, Scale, ChevronsDown, Wind, Flag,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { chartColor } from '@/lib/chartColors';
import { formatTimeInShot } from '../../models/api';

function formatNumber(value: number | undefined, decimals = 1): string | undefined {
  return typeof value === 'number' ? value.toFixed(decimals) : undefined;
}

interface StatBoxProps {
  label: string;
  color: string;
  stat?: string | number;
  icon?: ReactNode;
  statTarget?: string | number;
  unit?: string;
  className?: string;
}

export function StatBox({
  label, color, stat, icon, statTarget, unit, className,
}: StatBoxProps) {
  return (
    <Card
      className={cn('p-2 flex gap-2 items-stretch', className)}
      style={{ borderColor: color, borderWidth: 2, color }}
    >
      {icon && <div className="flex items-center [&_svg]:size-5">{icon}</div>}
      <div className="flex-1 flex flex-col text-right">
        <div className="font-bold leading-tight">{label}</div>
        <div className="leading-tight">{`${stat ?? '—'} ${unit || ''}`}</div>
        {statTarget !== undefined && statTarget !== null && Number(statTarget) >= 0 && (
          <div className="flex justify-end items-center gap-1 text-xs [&_svg]:size-3">
            <Flag />
            {`${statTarget} ${unit ?? ''}`}
          </div>
        )}
      </div>
    </Card>
  );
}

interface BaseProps { className?: string }

export function TimeStatBox({ timeInShot, className }: BaseProps & { timeInShot: number }) {
  return (
    <StatBox
      label="Time"
      icon={<Timer />}
      color="hsl(var(--foreground))"
      stat={formatTimeInShot(timeInShot)}
      className={className}
    />
  );
}

export function WeightStatBox({
  shotWeight, target, className,
}: BaseProps & { shotWeight: number; target?: number }) {
  return (
    <StatBox
      label="Weight"
      icon={<Scale />}
      color={chartColor('weight')}
      stat={formatNumber(shotWeight)}
      statTarget={formatNumber(target)}
      unit="g"
      className={className}
    />
  );
}

export function TemperatureStatBox({
  temperature, target, className,
}: BaseProps & { temperature: number; target?: number }) {
  return (
    <StatBox
      label="Temp"
      icon={<Thermometer />}
      color={chartColor('temperature')}
      stat={formatNumber(temperature)}
      statTarget={formatNumber(target)}
      unit="°C"
      className={className}
    />
  );
}

export function PumpFlowStatBox({
  pumpFlow, target, className,
}: BaseProps & { pumpFlow: number; target?: number }) {
  return (
    <StatBox
      label="Pump Flow"
      icon={<Wind />}
      color={chartColor('flow')}
      stat={formatNumber(pumpFlow)}
      statTarget={formatNumber(target)}
      unit="ml/s"
      className={className}
    />
  );
}

export function WeightFlowStatBox({
  flow, target, className,
}: BaseProps & { flow: number; target?: number }) {
  return (
    <StatBox
      label="Weight Flow"
      icon={<Wind />}
      color={chartColor('weight-flow')}
      stat={formatNumber(flow)}
      statTarget={formatNumber(target)}
      unit="ml/s"
      className={className}
    />
  );
}

export function PressureStatBox({
  pressure, target, className,
}: BaseProps & { pressure: number; target?: number }) {
  return (
    <StatBox
      icon={<ChevronsDown />}
      label="Pressure"
      color={chartColor('pressure')}
      stat={formatNumber(pressure)}
      statTarget={formatNumber(target)}
      unit="bar"
      className={className}
    />
  );
}
