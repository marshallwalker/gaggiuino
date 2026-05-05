"use client"

import { useState, useEffect } from "react"
import { Droplets } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export function WaterLevel() {
  const [level, setLevel] = useState(72)

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLevel((prev) => {
        const change = (Math.random() - 0.5) * 2
        return Math.max(0, Math.min(100, prev + change))
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = () => {
    if (level < 20) return "text-destructive"
    if (level < 40) return "text-yellow-500"
    return "text-primary"
  }

  const getBarColor = () => {
    if (level < 20) return "bg-destructive"
    if (level < 40) return "bg-yellow-500"
    return "bg-primary"
  }

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Droplets className={`h-5 w-5 ${getStatusColor()}`} />
            <span className="text-sm font-medium text-foreground">Water Level</span>
          </div>
          <span className={`text-2xl font-bold tabular-nums ${getStatusColor()}`}>
            {Math.round(level)}%
          </span>
        </div>
        
        {/* Tank visualization */}
        <div className="relative h-32 w-full bg-secondary rounded-lg overflow-hidden border border-border">
          <div
            className={`absolute bottom-0 left-0 right-0 transition-all duration-500 ${getBarColor()}`}
            style={{ height: `${level}%`, opacity: 0.8 }}
          />
          {/* Water surface effect */}
          <div
            className="absolute left-0 right-0 h-1 bg-foreground/20"
            style={{ bottom: `${level}%`, transform: "translateY(50%)" }}
          />
          {/* Graduation marks */}
          {[25, 50, 75].map((mark) => (
            <div
              key={mark}
              className="absolute left-0 right-0 flex items-center"
              style={{ bottom: `${mark}%` }}
            >
              <div className="w-2 h-px bg-muted-foreground/30" />
              <span className="text-[10px] text-muted-foreground ml-1">{mark}%</span>
            </div>
          ))}
        </div>

        {level < 20 && (
          <p className="text-xs text-destructive mt-2 text-center font-medium">
            Low water - please refill
          </p>
        )}
      </CardContent>
    </Card>
  )
}
