"use client"

import Link from "next/link"
import { Settings, Coffee, Home, Sliders } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WifiConfig } from "@/components/settings/wifi-config"
import { TofSensorConfig } from "@/components/settings/tof-sensor-config"
import { ScalesConfig } from "@/components/settings/scales-config"
import { LogsConfig } from "@/components/settings/logs-config"

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Coffee className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Gaggiuino</h1>
              <p className="text-sm text-muted-foreground">Hardware Configuration</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/">
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/profiles">
                  <Sliders className="h-4 w-4 mr-2" />
                  Profiles
                </Link>
              </Button>
              <div className="flex items-center gap-2 text-primary px-3 py-1.5 bg-primary/10 rounded-md">
                <Settings className="h-4 w-4" />
                <span className="text-sm font-medium">Settings</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Page Title */}
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Device Settings</h2>
            <p className="text-muted-foreground mt-1">
              Configure network, sensors, and calibration settings for your Gaggiuino.
            </p>
          </div>

          {/* Settings Sections */}
          <div className="grid gap-6">
            <WifiConfig />
            <TofSensorConfig />
            <ScalesConfig />
            <LogsConfig />
          </div>

          {/* Footer Info */}
          <div className="text-center py-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Firmware v2.4.1 • Last sync: Just now
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
