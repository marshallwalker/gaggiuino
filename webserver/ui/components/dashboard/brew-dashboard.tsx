"use client"

import { WaterLevel } from "@/components/dashboard/water-level"
import { ScaleDisplay } from "@/components/dashboard/scale-display"
import { PressureGauge } from "@/components/dashboard/pressure-gauge"
import { TemperatureDisplay } from "@/components/dashboard/temperature-display"
import { ProfileSelector } from "@/components/dashboard/profile-selector"
import { ShotTimer } from "@/components/dashboard/shot-timer"
import { ShotGraph } from "@/components/dashboard/shot-graph"

export function BrewDashboard() {
  return (
    <div className="space-y-6">
      {/* Primary controls - Shot timer and scale */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ShotTimer />
        <ScaleDisplay />
      </div>

      {/* Sensor readings grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <PressureGauge />
        <TemperatureDisplay />
        <WaterLevel />
        <ProfileSelector />
      </div>

      {/* Shot graph - full width */}
      <ShotGraph />

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <p className="text-xs text-muted-foreground">Today&apos;s Shots</p>
          <p className="text-2xl font-bold text-foreground mt-1">7</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <p className="text-xs text-muted-foreground">Avg Shot Time</p>
          <p className="text-2xl font-bold text-foreground mt-1">28.3s</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <p className="text-xs text-muted-foreground">Avg Yield</p>
          <p className="text-2xl font-bold text-foreground mt-1">36.2g</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <p className="text-xs text-muted-foreground">Total Coffee</p>
          <p className="text-2xl font-bold text-foreground mt-1">126g</p>
        </div>
      </div>
    </div>
  )
}
