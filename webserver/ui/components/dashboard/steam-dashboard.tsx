"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Thermometer, Gauge, Timer, Milk } from "lucide-react"

export function SteamDashboard() {
  const [steamTemp, setSteamTemp] = useState(145)
  const [steamPressure, setSteamPressure] = useState(1.2)
  const [isSteaming, setIsSteaming] = useState(false)
  const [steamTime, setSteamTime] = useState(0)
  const [targetTemp, setTargetTemp] = useState(65)

  // Simulate steam temperature fluctuations
  useEffect(() => {
    const interval = setInterval(() => {
      setSteamTemp(prev => 145 + Math.random() * 10 - 5)
      setSteamPressure(prev => 1.2 + Math.random() * 0.3 - 0.15)
    }, 500)
    return () => clearInterval(interval)
  }, [])

  // Steam timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isSteaming) {
      interval = setInterval(() => {
        setSteamTime(prev => prev + 100)
      }, 100)
    }
    return () => clearInterval(interval)
  }, [isSteaming])

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const tenths = Math.floor((ms % 1000) / 100)
    return `${seconds}.${tenths}`
  }

  const handleSteamToggle = () => {
    if (isSteaming) {
      setIsSteaming(false)
    } else {
      setSteamTime(0)
      setIsSteaming(true)
    }
  }

  // Calculate gauge rotation for steam pressure (0-2 bar range)
  const pressureRotation = (steamPressure / 2) * 180 - 90

  return (
    <div className="space-y-6">
      {/* Steam Timer - Primary Control */}
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-6">
            {/* Large Timer Display */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Steam Time</p>
              <div className="text-6xl font-mono font-bold text-foreground tabular-nums">
                {formatTime(steamTime)}
                <span className="text-2xl text-muted-foreground">s</span>
              </div>
            </div>

            {/* Steam Button */}
            <Button
              size="lg"
              className={`w-48 h-16 text-lg font-semibold transition-all ${
                isSteaming 
                  ? "bg-amber-500 hover:bg-amber-600 text-black animate-pulse" 
                  : "bg-primary hover:bg-primary/90"
              }`}
              onClick={handleSteamToggle}
            >
              <Milk className="h-6 w-6 mr-3" />
              {isSteaming ? "Stop Steam" : "Start Steam"}
            </Button>

            {/* Target Milk Temperature */}
            <div className="flex items-center gap-4 mt-2">
              <span className="text-sm text-muted-foreground">Target milk temp:</span>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={() => setTargetTemp(prev => Math.max(50, prev - 5))}
                >
                  -
                </Button>
                <span className="text-lg font-semibold text-foreground w-16 text-center">
                  {targetTemp}°C
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={() => setTargetTemp(prev => Math.min(80, prev + 5))}
                >
                  +
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Steam Pressure and Temperature */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Steam Boiler Temperature */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Thermometer className="h-4 w-4" />
              Steam Boiler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-foreground">
                {steamTemp.toFixed(1)}
              </span>
              <span className="text-xl text-muted-foreground">°C</span>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Ready</span>
                <span>Optimal</span>
                <span>Max</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 via-primary to-red-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, (steamTemp / 160) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>130°C</span>
                <span>145°C</span>
                <span>160°C</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Steam Pressure Gauge */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              Steam Pressure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-foreground">
                {steamPressure.toFixed(2)}
              </span>
              <span className="text-xl text-muted-foreground">bar</span>
            </div>
            
            {/* Visual gauge */}
            <div className="mt-4 relative h-24 flex items-end justify-center">
              <svg viewBox="0 0 100 50" className="w-full max-w-[200px]">
                {/* Background arc */}
                <path
                  d="M 10 50 A 40 40 0 0 1 90 50"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-secondary"
                />
                {/* Active arc */}
                <path
                  d="M 10 50 A 40 40 0 0 1 90 50"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={`${(steamPressure / 2) * 125.6} 125.6`}
                  className="text-amber-500"
                />
                {/* Needle */}
                <line
                  x1="50"
                  y1="50"
                  x2="50"
                  y2="15"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-foreground"
                  transform={`rotate(${pressureRotation} 50 50)`}
                />
                {/* Center dot */}
                <circle cx="50" cy="50" r="4" fill="currentColor" className="text-foreground" />
              </svg>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>0 bar</span>
              <span>1 bar</span>
              <span>2 bar</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Steam Tips */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Steaming Tips
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
                <Timer className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium text-foreground">Flat White</p>
                <p className="text-muted-foreground text-xs">55-60°C, minimal foam</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <p className="text-xs text-muted-foreground">Total Steam Time</p>
          <p className="text-2xl font-bold text-foreground mt-1">2:34</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <p className="text-xs text-muted-foreground">Drinks Steamed</p>
          <p className="text-2xl font-bold text-foreground mt-1">4</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <p className="text-xs text-muted-foreground">Avg Steam Time</p>
          <p className="text-2xl font-bold text-foreground mt-1">38s</p>
        </div>
      </div>
    </div>
  )
}
