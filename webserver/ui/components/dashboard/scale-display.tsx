"use client"

import { useState, useEffect } from "react"
import { Scale, RotateCcw } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function ScaleDisplay() {
  const [weight, setWeight] = useState(18.2)
  const [targetWeight] = useState(36)
  const [tared, setTared] = useState(false)

  // Simulate weight changes
  useEffect(() => {
    const interval = setInterval(() => {
      setWeight((prev) => {
        const change = (Math.random() - 0.5) * 0.2
        return Math.max(0, parseFloat((prev + change).toFixed(1)))
      })
    }, 500)
    return () => clearInterval(interval)
  }, [])

  const handleTare = () => {
    setWeight(0)
    setTared(true)
    setTimeout(() => setTared(false), 1000)
  }

  const ratio = weight > 0 ? (weight / 18).toFixed(1) : "0.0"
  const progress = Math.min((weight / targetWeight) * 100, 100)

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-foreground">Scale</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTare}
            className="h-7 px-2 text-xs"
          >
            <RotateCcw className={`h-3 w-3 mr-1 ${tared ? "animate-spin" : ""}`} />
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
            <span>Progress to {targetWeight}g</span>
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
          <span className="text-sm font-medium text-foreground">18g : {weight.toFixed(1)}g</span>
        </div>
      </CardContent>
    </Card>
  )
}
