"use client"

import { useState } from "react"
import { Droplets, Info } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useSensorData } from "@/hooks/use-sensor-data"
import { calibrateTofEmpty, calibrateTofFull } from "@/lib/tof-client"

export function TofSensorConfig() {
  const sensor = useSensorData()
  const [busy, setBusy] = useState<"empty" | "full" | null>(null)

  // The STM stores empty > full (in mm) — distance from sensor to water:
  // empty tank reads farther, full tank reads closer. A 0 in either field
  // means the user hasn't captured that endpoint yet (uncalibrated).
  const rawMm = sensor.tofRangeRaw
  const emptyMm = sensor.tofRangeEmpty
  const fullMm = sensor.tofRangeFull
  const haveSignal = rawMm > 0
  const calibrated = emptyMm > 0 && fullMm > 0 && emptyMm > fullMm

  // The firmware computes waterLvl from the calibrated endpoints; trust it
  // rather than recomputing client-side.
  const waterLevelPercent = calibrated ? sensor.waterLvl : null

  const status = (() => {
    if (!calibrated || waterLevelPercent === null) {
      return { label: "Not Calibrated", color: "text-muted-foreground", bgColor: "bg-muted" }
    }
    if (waterLevelPercent < 15) return { label: "Low", color: "text-destructive", bgColor: "bg-destructive/20" }
    if (waterLevelPercent < 30) return { label: "Warning", color: "text-chart-3", bgColor: "bg-chart-3/20" }
    return { label: "OK", color: "text-primary", bgColor: "bg-primary/20" }
  })()

  async function handleCapture(target: "empty" | "full") {
    if (!haveSignal) {
      toast.error("No raw signal — sensor not reporting yet")
      return
    }
    setBusy(target)
    const captured = rawMm
    try {
      if (target === "full") {
        await calibrateTofFull()
        toast.success(`Tank FULL captured @ ${captured} mm`)
      } else {
        await calibrateTofEmpty()
        toast.success(`Tank EMPTY captured @ ${captured} mm`)
      }
    } catch (e) {
      // 422 means the STM rejected the value (e.g. captured EMPTY while the
      // tank was actually full, leaving empty <= full). Surface the message
      // so the user knows to flip them.
      toast.error(e instanceof Error ? e.message : "Calibration failed")
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Droplets className="h-5 w-5 text-chart-2" />
            <div>
              <CardTitle>TOF Water Level Sensor</CardTitle>
              <CardDescription>VL53L0X time-of-flight sensor for tank level detection</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className={status.color}>
            {status.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Live Reading Display */}
        <div className="p-4 rounded-lg bg-secondary/50 border border-border">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm text-muted-foreground">Current Reading</Label>
            <span className="font-mono text-2xl font-semibold text-foreground">
              {haveSignal ? (
                <>
                  {rawMm} <span className="text-sm text-muted-foreground">mm</span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">— no signal —</span>
              )}
            </span>
          </div>
          {waterLevelPercent !== null && (
            <>
              <Progress value={waterLevelPercent} className="h-3" />
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>Empty</span>
                <span className="font-medium text-foreground">
                  {Math.round(waterLevelPercent)}% Full
                </span>
                <span>Full</span>
              </div>
            </>
          )}
        </div>

        {/* Calibration Points */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="p-4 rounded-lg border border-border space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Empty Point</Label>
              {emptyMm > 0 ? (
                <span className="font-mono text-lg text-foreground">{emptyMm} mm</span>
              ) : (
                <span className="text-sm text-muted-foreground">Not set</span>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => handleCapture("empty")}
              disabled={!haveSignal || busy !== null}
              className="w-full"
            >
              {busy === "empty" ? "Capturing…" : "Set Empty Point"}
            </Button>
          </div>

          <div className="p-4 rounded-lg border border-border space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Full Point</Label>
              {fullMm > 0 ? (
                <span className="font-mono text-lg text-foreground">{fullMm} mm</span>
              ) : (
                <span className="text-sm text-muted-foreground">Not set</span>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => handleCapture("full")}
              disabled={!haveSignal || busy !== null}
              className="w-full"
            >
              {busy === "full" ? "Capturing…" : "Set Full Point"}
            </Button>
          </div>
        </div>

        {/* Recommendation Note */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Capture the EMPTY point with ~1.5&quot; (38 mm) of water still in the
            tank — this gives the low-water warning headroom before the boiler
            actually runs dry. Each capture persists to EEPROM immediately.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
