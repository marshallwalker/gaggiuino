"use client"

import { Thermometer, Flame } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useSensorData } from "@/hooks/use-sensor-data"

export function TemperatureDisplay() {
  const sensor = useSensorData()
  const boilerTemp = sensor.temperature
  const targetTemp = sensor.targetTemperature

  // Heating = current is more than half a degree below target. Mirrors the
  // brew-control logic on the STM (just_do_coffee.cpp pulses the boiler when
  // temperature < setpoint).
  const heating = boilerTemp < targetTemp - 0.5
  const isStable = Math.abs(boilerTemp - targetTemp) < 1

  // Bar fills from ambient (~20°C) up to 110% of the target. The target
  // mark always sits at 90% of the bar width — that way "bar full" reads
  // as "at temperature" and the top 10% is overshoot headroom. Works in
  // both brew (target ~93°C) and steam (target ~155°C) without retuning
  // the range. Guarded so targetTemp=0 (pre-WS-handshake) collapses to
  // a no-op zero bar instead of dividing by a tiny span.
  const FLOOR = 20
  const TARGET_POSITION = 0.9
  const haveTarget = targetTemp > FLOOR
  const span = haveTarget ? (targetTemp - FLOOR) / TARGET_POSITION : 0
  const clamped = haveTarget ? Math.max(FLOOR, Math.min(FLOOR + span, boilerTemp)) : FLOOR
  const barFill = haveTarget ? ((clamped - FLOOR) / span) * 100 : 0
  const targetMark = haveTarget ? TARGET_POSITION * 100 : 0

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-foreground">Temperature</span>
          </div>
          {heating && (
            <div className="flex items-center gap-1 text-orange-500">
              <Flame className="h-4 w-4 animate-pulse" />
              <span className="text-xs">Heating</span>
            </div>
          )}
          {isStable && !heating && (
            <span className="text-xs text-primary px-2 py-0.5 bg-primary/10 rounded">Ready</span>
          )}
        </div>

        {/* Main boiler temperature */}
        <div className="text-center py-3">
          <div className="text-4xl font-bold tabular-nums text-foreground">
            {boilerTemp.toFixed(1)}
            <span className="text-xl text-muted-foreground">°C</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Boiler</p>
        </div>

        {/* Temperature bar */}
        <div className="relative h-3 bg-secondary rounded-full overflow-hidden mb-4">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-primary to-orange-500"
            style={{ width: `${barFill}%` }}
          />
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-foreground"
            style={{ left: `${targetMark}%` }}
          />
        </div>

        {/* Target reading */}
        <div className="pt-3 border-t border-border">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Target</p>
            <p className="text-lg font-semibold tabular-nums text-primary">
              {targetTemp.toFixed(1)}°C
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
