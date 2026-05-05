"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Activity } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts"
import { useSensorData } from "@/hooks/use-sensor-data"
import { useShotData } from "@/hooks/use-shot-data"

interface DataPoint {
  time: number       // seconds since brew start
  pressure: number
  flow: number
  weight: number
  targetPressure: number
}

export function ShotGraph() {
  const sensor = useSensorData()
  const shot = useShotData()

  const [series, setSeries] = useState<DataPoint[]>([])
  // Tracks the previous brewActive value across renders so we can detect the
  // false→true edge for a clean reset.
  const prevBrewActive = useRef(false)
  // Tracks the last appended timeInShot so we don't double-append when the
  // useShotData hook re-emits the same frame (defensive — shouldn't happen
  // but cheap insurance).
  const lastTimeMs = useRef<number | null>(null)

  useEffect(() => {
    if (sensor.brewActive && !prevBrewActive.current) {
      // New brew just started — reset series. The first new shot frame
      // re-populates it on the next effect run.
      setSeries([])
      lastTimeMs.current = null
    } else if (sensor.brewActive && shot && shot.timeInShot !== lastTimeMs.current) {
      lastTimeMs.current = shot.timeInShot
      setSeries((prev) => [
        ...prev,
        {
          time: +(shot.timeInShot / 1000).toFixed(1),
          pressure: +shot.pressure.toFixed(2),
          flow: +shot.pumpFlow.toFixed(2),
          weight: +shot.shotWeight.toFixed(2),
          // 0 means "no pressure target" (flow profile or off-phase) — still
          // store it so the dashed line drops to 0 cleanly during those phases.
          targetPressure: +shot.targetPressure.toFixed(2),
        },
      ])
    }
    // brewActive true → false: leave series in place so the user can review
    // the just-finished shot.
    prevBrewActive.current = sensor.brewActive
  }, [sensor.brewActive, shot])

  const hasData = series.length > 0
  const stats = useMemo(() => {
    if (!hasData) return null
    const last = series[series.length - 1]
    return {
      duration: last.time,
      peakPressure: series.reduce((m, p) => Math.max(m, p.pressure), 0),
      avgFlow: series.reduce((s, p) => s + p.flow, 0) / series.length,
      yield: last.weight,
    }
  }, [series, hasData])

  return (
    <Card className="bg-card border-border col-span-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-foreground">Shot Graph</span>
          </div>
          {sensor.brewActive && (
            <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Recording
            </span>
          )}
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="time"
                className="text-muted-foreground"
                tick={{ fill: "oklch(0.65 0 0)" }}
                stroke="oklch(0.65 0 0)"
                fontSize={10}
                tickFormatter={(v) => `${v}s`}
                type="number"
                domain={[0, "dataMax"]}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: "oklch(0.65 0 0)" }}
                stroke="oklch(0.65 0 0)"
                fontSize={10}
                domain={[0, 12]}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: "oklch(0.65 0 0)" }}
                stroke="oklch(0.65 0 0)"
                fontSize={10}
                domain={[0, 45]}
              />
              <Legend
                wrapperStyle={{ fontSize: "10px", color: "oklch(0.95 0 0)" }}
                formatter={(value) => <span style={{ color: "oklch(0.95 0 0)" }}>{value}</span>}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="pressure"
                name="Pressure (bar)"
                stroke="oklch(0.65 0.15 145)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="targetPressure"
                name="Target (bar)"
                stroke="oklch(0.65 0.15 145)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={false}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="flow"
                name="Flow (ml/s)"
                stroke="oklch(0.6 0.15 200)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="weight"
                name="Weight (g)"
                stroke="oklch(0.7 0.15 50)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {stats && (
          <div className="mt-4 pt-3 border-t border-border grid grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="text-sm font-medium text-foreground">{stats.duration.toFixed(1)}s</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Peak Pressure</p>
              <p className="text-sm font-medium text-foreground">{stats.peakPressure.toFixed(1)} bar</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Flow</p>
              <p className="text-sm font-medium text-foreground">{stats.avgFlow.toFixed(1)} ml/s</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Yield</p>
              <p className="text-sm font-medium text-foreground">{stats.yield.toFixed(1)}g</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
