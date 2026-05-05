"use client"

import { useState } from "react"
import { Scale, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useSensorData } from "@/hooks/use-sensor-data"
import { tareScales } from "@/lib/scales-client"

// Hardcoded reference dose for the brew-ratio readout. The active profile's
// shotDose isn't currently exposed over the WS sensor stream — when it is,
// swap this for the real value.
const REFERENCE_DOSE = 18
const TARGET_WEIGHT = 36

export function ScaleDisplay() {
  const sensor = useSensorData()
  const [taring, setTaring] = useState(false)

  // STM clamps weight below 0.1g to 0.0g already (the noise-floor fix
  // documented in the README). Keep the display non-negative defensively
  // in case of floating-point rounding from JSON.
  const weight = Math.max(0, sensor.weight)

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

  const ratio = weight > 0 ? (weight / REFERENCE_DOSE).toFixed(1) : "0.0"
  const progress = Math.min((weight / TARGET_WEIGHT) * 100, 100)

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

        {/* Progress to target */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress to {TARGET_WEIGHT}g</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Ratio display */}
        <div className="mt-4 pt-3 border-t border-border flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Brew Ratio (1:{ratio})</span>
          <span className="text-sm font-medium text-foreground">{REFERENCE_DOSE}g : {weight.toFixed(1)}g</span>
        </div>
      </CardContent>
    </Card>
  )
}
