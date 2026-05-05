"use client"

import { useEffect, useRef, useState } from "react"
import { Timer } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useSensorData } from "@/hooks/use-sensor-data"
import { useShotData } from "@/hooks/use-shot-data"

function formatTime(ms: number): string {
  const totalSeconds = ms / 1000
  const mins = Math.floor(totalSeconds / 60)
  const secs = Math.floor(totalSeconds % 60)
  const tenths = Math.floor((totalSeconds % 1) * 10)
  return `${mins}:${secs.toString().padStart(2, "0")}.${tenths}`
}

export function ShotTimer() {
  const sensor = useSensorData()
  const shot = useShotData()

  // The displayed time. Driven by:
  //  - brewActive false→true transition: reset to 0
  //  - brewActive true (live):           track shot.timeInShot
  //  - brewActive true→false:            freeze on the last seen value
  // Stored as state (not derived) so the displayed number stays put after
  // the last shot frame arrives, even when newer shot frames stop coming in.
  const [displayMs, setDisplayMs] = useState(0)
  const prevBrewActive = useRef(false)

  useEffect(() => {
    if (sensor.brewActive && !prevBrewActive.current) {
      // Brew just started — reset, the next shot frame will populate.
      setDisplayMs(0)
    } else if (sensor.brewActive && shot) {
      // Live track. Shot frames are 10 Hz; the timer updates with them.
      setDisplayMs(shot.timeInShot)
    }
    // Brew ended (true → false): leave displayMs at the last value so the
    // user sees the final shot time. Don't reset until a new brew starts.
    prevBrewActive.current = sensor.brewActive
  }, [sensor.brewActive, shot])

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-foreground">Shot Timer</span>
          </div>
          {sensor.brewActive && (
            <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
              Brewing
            </span>
          )}
        </div>

        {/* Timer display */}
        <div className="text-center py-6">
          <div
            className={`text-6xl font-bold tabular-nums font-mono ${
              sensor.brewActive ? "text-primary" : "text-foreground"
            }`}
          >
            {formatTime(displayMs)}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
