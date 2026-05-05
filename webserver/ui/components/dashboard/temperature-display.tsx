"use client"

import { useState, useEffect } from "react"
import { Thermometer, Flame } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export function TemperatureDisplay() {
  const [boilerTemp, setBoilerTemp] = useState(93.2)
  const [targetTemp] = useState(93)
  const [heating, setHeating] = useState(false)

  // Simulate temperature fluctuations
  useEffect(() => {
    const interval = setInterval(() => {
      setBoilerTemp((prev) => {
        const change = (Math.random() - 0.5) * 0.3
        const newTemp = prev + change
        setHeating(newTemp < targetTemp - 0.5)
        return Math.max(85, Math.min(98, newTemp))
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [targetTemp])

  const isStable = Math.abs(boilerTemp - targetTemp) < 1

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-foreground">Temperature</span>
          </div>
          {heating && (
            <div className="flex items-center gap-1 text-orange-500">
              <Flame className="h-4 w-4 animate-pulse" />
              <span className="text-xs">Heating</span>
            </div>
          )}
          {isStable && !heating && (
            <span className="text-xs text-primary px-2 py-0.5 bg-primary/10 rounded">Ready</span>
          )}
        </div>

        {/* Main boiler temperature */}
        <div className="text-center py-3">
          <div className="text-4xl font-bold tabular-nums text-foreground">
            {boilerTemp.toFixed(1)}
            <span className="text-xl text-muted-foreground">°C</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Boiler</p>
        </div>

        {/* Temperature bar */}
        <div className="relative h-3 bg-secondary rounded-full overflow-hidden mb-4">
          {/* Temperature gradient */}
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-primary to-orange-500"
            style={{ width: `${((boilerTemp - 85) / 15) * 100}%` }}
          />
          {/* Target marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-foreground"
            style={{ left: `${((targetTemp - 85) / 15) * 100}%` }}
          />
        </div>

        {/* Target reading */}
        <div className="pt-3 border-t border-border">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Target</p>
            <p className="text-lg font-semibold tabular-nums text-primary">
              {targetTemp.toFixed(1)}°C
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
