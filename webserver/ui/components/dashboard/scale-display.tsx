"use client"

import { useState } from "react"
import { Scale, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useSensorData } from "@/hooks/use-sensor-data"
import { useActiveProfile } from "@/hooks/use-active-profile"
import { tareScales } from "@/lib/scales-client"

export function ScaleDisplay() {
  const sensor = useSensorData()
  const { data: profile } = useActiveProfile()
  const [taring, setTaring] = useState(false)

  // STM clamps weight below 0.1g to 0.0g already (the noise-floor fix
  // documented in the README). Keep the display non-negative defensively
  // in case of floating-point rounding from JSON.
  const weight = Math.max(0, sensor.weight)

  // Progress bar target comes from the active profile's stop-on-weight
  // setting. If the profile doesn't stop on weight, there's no meaningful
  // target so we hide the bar.
  const targetWeight =
    profile && profile.stopOnWeightState && profile.shotStopOnCustomWeight > 0
      ? profile.shotStopOnCustomWeight
      : null
  const progress = targetWeight ? Math.min((weight / targetWeight) * 100, 100) : 0

  const handleTare = async () => {
    setTaring(true)
    try {
      await tareScales()
      toast.success("Scales tared")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Tare failed")
    } finally {
      // Hold the spin a bit so the user sees it even if the request returned
      // instantly.
      setTimeout(() => setTaring(false), 500)
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-foreground">Scale</span>
            {!sensor.scalesPresent && (
              <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                offline
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTare}
            disabled={taring || !sensor.scalesPresent}
            className="h-7 px-2 text-xs"
          >
            <RotateCcw className={`h-3 w-3 mr-1 ${taring ? "animate-spin" : ""}`} />
            Tare
          </Button>
        </div>

        {/* Main weight display */}
        <div className="text-center py-4">
          <div className="text-5xl font-bold tabular-nums text-foreground">
            {weight.toFixed(1)}
            <span className="text-2xl text-muted-foreground ml-1">g</span>
          </div>
        </div>

        {/* Progress to target — only when the active profile stops on weight */}
        {targetWeight !== null && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress to {(+targetWeight.toFixed(1))}g</span>
              <span>{progress.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
