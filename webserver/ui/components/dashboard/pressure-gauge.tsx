"use client"

import { Gauge } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useSensorData } from "@/hooks/use-sensor-data"

const MAX_PRESSURE = 12
// Half-arc length (px) of the gauge background path. Used for the
// strokeDasharray math that maps a 0-MAX_PRESSURE range onto the arc.
const ARC_LENGTH = 251
// "On target" tolerance for highlighting in-range pressure during a phase.
const ON_TARGET_TOLERANCE = 0.5

export function PressureGauge() {
  const sensor = useSensorData()
  const pressure = Math.max(0, Math.min(MAX_PRESSURE, sensor.pressure))
  const isExtracting = sensor.brewActive
  // Target only meaningful when the active phase is driving toward something.
  // 0 = idle / non-pressure phase = no target band rendered.
  const target = sensor.targetPressure > 0
    ? Math.min(MAX_PRESSURE, sensor.targetPressure)
    : null

  const angle = (pressure / MAX_PRESSURE) * 180 - 90 // -90 to 90 degrees
  const isOnTarget = target !== null && Math.abs(pressure - target) <= ON_TARGET_TOLERANCE

  // A 1-bar-wide visual band centered on target (clamped at the gauge edges).
  // Just an indicator — the firmware controller is the authority on what
  // counts as "on target", we only highlight when within ±0.5 bar above.
  const targetBandSpan = target !== null ? 1 : 0
  const targetBandStart =
    target !== null ? Math.max(0, target - targetBandSpan / 2) : 0

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-foreground">Pressure</span>
          </div>
          <span
            className={`text-xs px-2 py-1 rounded ${
              isExtracting
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {isExtracting ? "Extracting" : "Idle"}
          </span>
        </div>

        {/* Gauge visualization */}
        <div className="relative h-28 flex items-end justify-center overflow-hidden">
          <svg
            viewBox="0 0 200 110"
            className="w-full h-full"
            style={{ maxWidth: "200px" }}
          >
            {/* Background arc */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              className="text-secondary"
              strokeLinecap="round"
            />
            {/* Target band — only rendered when the active phase has a target */}
            {target !== null && (
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="currentColor"
                strokeWidth="12"
                className="text-primary/30"
                strokeLinecap="round"
                strokeDasharray={`${(targetBandSpan / MAX_PRESSURE) * ARC_LENGTH} ${ARC_LENGTH}`}
                strokeDashoffset={`${-((targetBandStart / MAX_PRESSURE) * ARC_LENGTH)}`}
              />
            )}
            {/* Active pressure fill */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              className={isOnTarget ? "text-primary" : "text-foreground"}
              strokeLinecap="round"
              strokeDasharray={`${(pressure / MAX_PRESSURE) * ARC_LENGTH} ${ARC_LENGTH}`}
              style={{ transition: "stroke-dasharray 0.2s" }}
            />
            {/* Needle */}
            <g transform={`rotate(${angle}, 100, 100)`}>
              <line
                x1="100"
                y1="100"
                x2="100"
                y2="35"
                stroke="currentColor"
                strokeWidth="3"
                className="text-foreground"
                strokeLinecap="round"
              />
              <circle cx="100" cy="100" r="6" fill="currentColor" className="text-foreground" />
            </g>
            {/* Scale labels */}
            <text x="15" y="108" className="fill-muted-foreground text-[10px]">0</text>
            <text x="93" y="20" className="fill-muted-foreground text-[10px]">6</text>
            <text x="178" y="108" className="fill-muted-foreground text-[10px]">12</text>
          </svg>
        </div>

        {/* Pressure reading */}
        <div className="text-center mt-2">
          <span className={`text-3xl font-bold tabular-nums ${isOnTarget ? "text-primary" : "text-foreground"}`}>
            {pressure.toFixed(1)}
          </span>
          <span className="text-lg text-muted-foreground ml-1">bar</span>
        </div>

        {/* Live target line — only when the active phase has a target */}
        <div className="text-center text-xs text-muted-foreground mt-1 h-4">
          {target !== null ? `Target: ${target.toFixed(1)} bar` : ""}
        </div>
      </CardContent>
    </Card>
  )
}
