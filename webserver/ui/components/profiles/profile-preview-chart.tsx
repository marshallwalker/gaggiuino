"use client"

import { useMemo } from "react"
import { Profile, RampShape } from "@/lib/profile-types"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts"

interface ProfilePreviewChartProps {
  profile: Profile
}

// Apply ramp shape to interpolation
function applyShape(t: number, shape: RampShape): number {
  switch (shape) {
    case "ease-in":
      return t * t
    case "ease-out":
      return 1 - (1 - t) * (1 - t)
    case "s-curve":
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
    default:
      return t
  }
}

export function ProfilePreviewChart({ profile }: ProfilePreviewChartProps) {
  const data = useMemo(() => {
    const points: { time: number; pressure: number; flow: number }[] = []
    let time = 0

    // Preinfusion phase
    if (profile.preinfusion.enabled) {
      const duration = profile.preinfusion.mode === "pressure" 
        ? profile.preinfusion.pressureDuration 
        : profile.preinfusion.flowDuration
      const pressure = profile.preinfusion.mode === "pressure"
        ? profile.preinfusion.pressure
        : profile.preinfusion.pressureCap
      const flow = profile.preinfusion.mode === "flow"
        ? profile.preinfusion.flowRate
        : profile.preinfusion.flowCap * 0.5

      for (let i = 0; i <= duration; i++) {
        points.push({ time: time + i, pressure, flow })
      }
      time += duration
    }

    // Soak phase
    if (profile.soak.enabled) {
      const duration = profile.preinfusion.mode === "pressure"
        ? profile.soak.soakTimePressure
        : profile.soak.soakTimeFlow
      const pressure = profile.soak.maintainPressure
      const flow = profile.soak.maintainFlow

      for (let i = 0; i <= duration; i++) {
        points.push({ time: time + i, pressure, flow })
      }
      time += duration
    }

    // Ramp phase
    if (profile.ramp.duration > 0) {
      const startPressure = points.length > 0 ? points[points.length - 1].pressure : 2
      const endPressure = profile.transition.enabled 
        ? profile.transition.pressureStart 
        : (profile.main.enabled ? profile.main.pressureStart : 9)
      const startFlow = points.length > 0 ? points[points.length - 1].flow : 1
      const endFlow = profile.transition.enabled
        ? profile.transition.flowStart
        : (profile.main.enabled ? profile.main.flowStart : 2)

      for (let i = 0; i <= profile.ramp.duration; i++) {
        const t = applyShape(i / profile.ramp.duration, profile.ramp.shape)
        points.push({
          time: time + i,
          pressure: startPressure + (endPressure - startPressure) * t,
          flow: startFlow + (endFlow - startFlow) * t,
        })
      }
      time += profile.ramp.duration
    }

    // Transition phase
    if (profile.transition.enabled) {
      const holdDuration = profile.transition.pressureHoldDuration
      const slopeDuration = profile.transition.pressureSlopeDuration

      // Hold at start
      for (let i = 0; i < holdDuration; i++) {
        points.push({
          time: time + i,
          pressure: profile.transition.pressureStart,
          flow: profile.transition.flowStart,
        })
      }
      time += holdDuration

      // Slope to end
      for (let i = 0; i <= slopeDuration; i++) {
        const t = applyShape(i / slopeDuration, profile.transition.pressureSlopeShape)
        points.push({
          time: time + i,
          pressure: profile.transition.pressureStart + 
            (profile.transition.pressureEnd - profile.transition.pressureStart) * t,
          flow: profile.transition.flowStart +
            (profile.transition.flowEnd - profile.transition.flowStart) * t,
        })
      }
      time += slopeDuration
    }

    // Main phase
    if (profile.main.enabled) {
      const slopeDuration = profile.main.pressureSlopeDuration
      const startPressure = profile.transition.enabled 
        ? profile.transition.pressureEnd 
        : profile.main.pressureStart
      const startFlow = profile.transition.enabled
        ? profile.transition.flowEnd
        : profile.main.flowStart

      for (let i = 0; i <= slopeDuration; i++) {
        const t = applyShape(i / slopeDuration, profile.main.pressureSlopeShape)
        points.push({
          time: time + i,
          pressure: startPressure + (profile.main.pressureEnd - startPressure) * t,
          flow: startFlow + (profile.main.flowEnd - startFlow) * t,
        })
      }
    }

    return points
  }, [profile])

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.005 285)" />
          <XAxis
            dataKey="time"
            tick={{ fill: "oklch(0.65 0 0)", fontSize: 10 }}
            stroke="oklch(0.65 0 0)"
            tickFormatter={(v) => `${v}s`}
          />
          <YAxis
            yAxisId="pressure"
            tick={{ fill: "oklch(0.65 0 0)", fontSize: 10 }}
            stroke="oklch(0.65 0 0)"
            domain={[0, 12]}
            tickFormatter={(v) => `${v}`}
          />
          <YAxis
            yAxisId="flow"
            orientation="right"
            tick={{ fill: "oklch(0.65 0 0)", fontSize: 10 }}
            stroke="oklch(0.65 0 0)"
            domain={[0, 6]}
            tickFormatter={(v) => `${v}`}
          />
          <ReferenceLine yAxisId="pressure" y={9} stroke="oklch(0.65 0.15 145)" strokeDasharray="3 3" strokeOpacity={0.5} />
          <Legend
            wrapperStyle={{ fontSize: "10px", color: "oklch(0.95 0 0)" }}
            formatter={(value) => (
              <span style={{ color: "oklch(0.95 0 0)" }}>{value}</span>
            )}
          />
          <Line
            yAxisId="pressure"
            type="monotone"
            dataKey="pressure"
            name="Pressure (bar)"
            stroke="oklch(0.65 0.15 145)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            yAxisId="flow"
            type="monotone"
            dataKey="flow"
            name="Flow (ml/s)"
            stroke="oklch(0.6 0.15 200)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
