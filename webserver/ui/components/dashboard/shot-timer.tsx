"use client"

import { useState, useEffect, useRef } from "react"
import { RotateCcw, Timer } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function ShotTimer() {
  const [time, setTime] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [phase, setPhase] = useState<"idle" | "preinfusion" | "extraction">("idle")
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTime((prev) => {
          const newTime = prev + 0.1
          // Auto phase detection
          if (newTime < 5) {
            setPhase("preinfusion")
          } else {
            setPhase("extraction")
          }
          return newTime
        })
      }, 100)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning])

  const handleReset = () => {
    setIsRunning(false)
    setTime(0)
    setPhase("idle")
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const tenths = Math.floor((seconds % 1) * 10)
    return `${mins}:${secs.toString().padStart(2, "0")}.${tenths}`
  }

  const getPhaseColor = () => {
    switch (phase) {
      case "preinfusion":
        return "text-blue-400"
      case "extraction":
        return "text-primary"
      default:
        return "text-muted-foreground"
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-foreground">Shot Timer</span>
          </div>
          {phase !== "idle" && (
            <span className={`text-xs capitalize px-2 py-0.5 rounded bg-secondary ${getPhaseColor()}`}>
              {phase}
            </span>
          )}
        </div>

        {/* Timer display */}
        <div className="text-center py-6">
          <div className={`text-6xl font-bold tabular-nums font-mono ${isRunning ? "text-primary" : "text-foreground"}`}>
            {formatTime(time)}
          </div>
        </div>

        {/* Reset button */}
        <div className="flex items-center justify-center">
          <Button
            onClick={handleReset}
            variant="outline"
            size="sm"
            disabled={time === 0}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>

        {/* Target times */}
        <div className="mt-4 pt-3 border-t border-border grid grid-cols-2 gap-3 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Pre-infusion</p>
            <p className="text-sm font-medium text-foreground">0-5s</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Shot</p>
            <p className="text-sm font-medium text-foreground">25-35s</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
