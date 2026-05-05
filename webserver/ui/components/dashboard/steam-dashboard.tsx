"use client"

import { useEffect, useRef, useState } from "react"
import { Milk, Timer, Wind } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSensorData } from "@/hooks/use-sensor-data"
import { TemperatureDisplay } from "@/components/dashboard/temperature-display"

// Format milliseconds as "12.3" — single second + tenths is enough for a
// steam-pour timer, no minutes needed in normal use.
function formatSeconds(ms: number): string {
  const totalSeconds = ms / 1000
  const secs = Math.floor(totalSeconds)
  const tenths = Math.floor((totalSeconds % 1) * 10)
  return `${secs}.${tenths}`
}

export function SteamDashboard() {
  const sensor = useSensorData()

  // Steam is controlled by the physical switch on the machine — there's no
  // remote-trigger endpoint and no firmware "timeInSteam" counter, so we
  // measure session length client-side from the steamActive false→true edge.
  const [elapsedMs, setElapsedMs] = useState(0)
  const startedAt = useRef<number | null>(null)
  const prevSteamActive = useRef(false)

  // Edge handler: reset on rising edge, stop counting on falling edge but
  // leave the last elapsed value displayed for review.
  useEffect(() => {
    if (sensor.steamActive && !prevSteamActive.current) {
      startedAt.current = Date.now()
      setElapsedMs(0)
    } else if (!sensor.steamActive && prevSteamActive.current) {
      startedAt.current = null
      // elapsedMs is left where the interval last set it
    }
    prevSteamActive.current = sensor.steamActive
  }, [sensor.steamActive])

  // While steam is active, tick the elapsed display at 10 fps. The interval
  // is torn down when steamActive flips off, freezing the final value.
  useEffect(() => {
    if (!sensor.steamActive) return
    const id = setInterval(() => {
      if (startedAt.current !== null) {
        setElapsedMs(Date.now() - startedAt.current)
      }
    }, 100)
    return () => clearInterval(id)
  }, [sensor.steamActive])

  return (
    <div className="space-y-6">
      {/* Steam Timer */}
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Milk className="h-4 w-4" />
              <span>Steam Time</span>
              {sensor.steamActive && (
                <span className="ml-2 text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Steaming
                </span>
              )}
            </div>
            <div
              className={`text-7xl font-mono font-bold tabular-nums transition-colors ${
                sensor.steamActive ? "text-amber-400" : "text-foreground"
              }`}
            >
              {formatSeconds(elapsedMs)}
              <span className="text-3xl text-muted-foreground">s</span>
            </div>
            {!sensor.steamActive && (
              <p className="text-xs text-muted-foreground">
                Flip the steam switch on the machine to start
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Boiler temperature — reuses the brew-side card, which already scales
          its bar to whatever the live target is (155°C steam setpoint vs
          93°C brew setpoint). */}
      <TemperatureDisplay />

      {/* Steaming reference — generic milk-temp guidance, no live data */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Milk Temperature Targets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
              <div className="p-1.5 rounded bg-primary/20 text-primary">
                <Timer className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium text-foreground">Latte</p>
                <p className="text-muted-foreground text-xs">60-65°C, silky microfoam</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
              <div className="p-1.5 rounded bg-primary/20 text-primary">
                <Timer className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium text-foreground">Cappuccino</p>
                <p className="text-muted-foreground text-xs">60-65°C, thick foam</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
              <div className="p-1.5 rounded bg-primary/20 text-primary">
                <Wind className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium text-foreground">Flat White</p>
                <p className="text-muted-foreground text-xs">55-60°C, minimal foam</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
