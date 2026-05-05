"use client"

import { useState, useEffect } from "react"
import { Droplets, Info } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function TofSensorConfig() {
  const [emptyPoint, setEmptyPoint] = useState<number | null>(45)
  const [fullPoint, setFullPoint] = useState<number | null>(185)
  const [currentReading, setCurrentReading] = useState(127)

  // Simulate live sensor reading
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentReading((prev) => {
        const delta = (Math.random() - 0.5) * 4
        return Math.max(0, Math.min(250, prev + delta))
      })
    }, 500)
    return () => clearInterval(interval)
  }, [])

  const waterLevelPercent = emptyPoint !== null && fullPoint !== null
    ? Math.max(0, Math.min(100, ((currentReading - emptyPoint) / (fullPoint - emptyPoint)) * 100))
    : null

  const getWaterLevelStatus = () => {
    if (waterLevelPercent === null) return { label: "Not Calibrated", color: "text-muted-foreground", bgColor: "bg-muted" }
    if (waterLevelPercent < 15) return { label: "Low", color: "text-destructive", bgColor: "bg-destructive/20" }
    if (waterLevelPercent < 30) return { label: "Warning", color: "text-chart-3", bgColor: "bg-chart-3/20" }
    return { label: "OK", color: "text-primary", bgColor: "bg-primary/20" }
  }

  const status = getWaterLevelStatus()

  const handleSetEmpty = () => {
    setEmptyPoint(Math.round(currentReading))
  }

  const handleSetFull = () => {
    setFullPoint(Math.round(currentReading))
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
          <Badge variant="outline" className="text-muted-foreground">
            VL53L0X
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Live Reading Display */}
        <div className="p-4 rounded-lg bg-secondary/50 border border-border">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm text-muted-foreground">Current Reading</Label>
            <span className="font-mono text-2xl font-semibold text-foreground">
              {currentReading.toFixed(1)} <span className="text-sm text-muted-foreground">mm</span>
            </span>
          </div>
          {waterLevelPercent !== null && (
            <>
              <Progress value={waterLevelPercent} className="h-3" />
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>Empty</span>
                <span className="font-medium text-foreground">{waterLevelPercent.toFixed(0)}% Full</span>
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
              {emptyPoint !== null ? (
                <span className="font-mono text-lg text-foreground">{emptyPoint} mm</span>
              ) : (
                <span className="text-sm text-muted-foreground">Not set</span>
              )}
            </div>
            <Button 
              variant="outline" 
              onClick={handleSetEmpty}
              className="w-full"
            >
              Set Empty Point
            </Button>
          </div>

          <div className="p-4 rounded-lg border border-border space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Full Point</Label>
              {fullPoint !== null ? (
                <span className="font-mono text-lg text-foreground">{fullPoint} mm</span>
              ) : (
                <span className="text-sm text-muted-foreground">Not set</span>
              )}
            </div>
            <Button 
              variant="outline" 
              onClick={handleSetFull}
              className="w-full"
            >
              Set Full Point
            </Button>
          </div>
        </div>

        {/* Recommendation Note */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            It is recommended to set the empty point with approximately 1.5&quot; (38mm) of water remaining in the tank to prevent the machine from running completely dry.
          </AlertDescription>
        </Alert>

        {/* Save Button */}
        <Button className="w-full">
          Save Settings
        </Button>
      </CardContent>
    </Card>
  )
}
