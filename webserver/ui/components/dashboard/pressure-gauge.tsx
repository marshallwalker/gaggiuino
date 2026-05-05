"use client"

import { Gauge } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useSensorData } from "@/hooks/use-sensor-data"

export function PressureGauge() {
  const sensor = useSensorData()
  const pressure = Math.max(0, Math.min(12, sensor.pressure))
  const isExtracting = sensor.brewActive

  const maxPressure = 12
  const targetMin = 8
  const targetMax = 10
  const angle = (pressure / maxPressure) * 180 - 90 // -90 to 90 degrees

  const isInRange = pressure >= targetMin && pressure <= targetMax

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
          {/* Gauge background arc */}
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
            {/* Target zone */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              className="text-primary/30"
              strokeLinecap="round"
              strokeDasharray={`${((targetMax - targetMin) / maxPressure) * 251} 251`}
              strokeDashoffset={`${-((targetMin / maxPressure) * 251)}`}
            />
            {/* Active pressure */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              className={isInRange ? "text-primary" : "text-foreground"}
              strokeLinecap="round"
              strokeDasharray={`${(pressure / maxPressure) * 251} 251`}
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
          <span className={`text-3xl font-bold tabular-nums ${isInRange ? "text-primary" : "text-foreground"}`}>
            {pressure.toFixed(1)}
          </span>
          <span className="text-lg text-muted-foreground ml-1">bar</span>
        </div>

        <div className="text-center text-xs text-muted-foreground mt-1">
          Target: {targetMin}-{targetMax} bar
        </div>
      </CardContent>
    </Card>
  )
}
