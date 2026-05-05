"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Coffee, Settings, Sliders, Wind } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BrewDashboard } from "@/components/dashboard/brew-dashboard"
import { SteamDashboard } from "@/components/dashboard/steam-dashboard"
import { useSensorData } from "@/hooks/use-sensor-data"

type MachineMode = "brew" | "steam"

export default function HomePage() {
  const sensor = useSensorData()
  const [mode, setMode] = useState<MachineMode>("brew")
  // Track the previous steamActive value so we only auto-switch on the
  // physical switch transitions — not on every WS frame. Manual clicks on
  // the brew/steam buttons still work in between transitions.
  const prevSteamActive = useRef(false)

  useEffect(() => {
    if (sensor.steamActive !== prevSteamActive.current) {
      setMode(sensor.steamActive ? "steam" : "brew")
    }
    prevSteamActive.current = sensor.steamActive
  }, [sensor.steamActive])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Coffee className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Gaggiuino</h1>
              <p className="text-sm text-muted-foreground">Dashboard</p>
            </div>
            
            {/* Mode Toggle */}
            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center bg-secondary rounded-lg p-1">
                <Button
                  variant={mode === "brew" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setMode("brew")}
                  className={mode === "brew" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}
                >
                  <Coffee className="h-4 w-4 mr-2" />
                  Brew
                </Button>
                <Button
                  variant={mode === "steam" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setMode("steam")}
                  className={mode === "steam" ? "bg-amber-500 text-black hover:bg-amber-600" : "text-muted-foreground hover:text-foreground"}
                >
                  <Wind className="h-4 w-4 mr-2" />
                  Steam
                </Button>
              </div>
              
              {/* Profiles + Settings links */}
              <Button variant="ghost" size="sm" asChild>
                <Link href="/profiles">
                  <Sliders className="h-4 w-4 mr-2" />
                  Profiles
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Mode-specific dashboard */}
        {mode === "brew" ? <BrewDashboard /> : <SteamDashboard />}
      </main>
    </div>
  )
}
