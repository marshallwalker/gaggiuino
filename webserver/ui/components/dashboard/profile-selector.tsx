"use client"

import { useState } from "react"
import { Layers, ChevronRight, Check } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const profiles = [
  {
    id: "londinium",
    name: "Londinium",
    description: "Long preinfusion, lever-style pressure profile",
    preinfusion: "8-10s",
    pressure: "6-9 bar",
    temp: "93°C",
  },
  {
    id: "la-marzocco",
    name: "La Marzocco",
    description: "Classic Italian flat 9 bar profile",
    preinfusion: "3-5s",
    pressure: "9 bar",
    temp: "93°C",
  },
  {
    id: "slayer",
    name: "Slayer",
    description: "Extended preinfusion with slow ramp",
    preinfusion: "15-20s",
    pressure: "3-9 bar",
    temp: "92°C",
  },
  {
    id: "blooming",
    name: "Blooming",
    description: "Turbo-style with bloom phase",
    preinfusion: "30s bloom",
    pressure: "2-6 bar",
    temp: "90°C",
  },
  {
    id: "classic",
    name: "Classic 9 Bar",
    description: "Traditional flat pressure profile",
    preinfusion: "2-3s",
    pressure: "9 bar",
    temp: "93°C",
  },
  {
    id: "custom",
    name: "Custom",
    description: "Your custom pressure profile",
    preinfusion: "Variable",
    pressure: "Variable",
    temp: "Variable",
  },
]

export function ProfileSelector() {
  const [selectedProfile, setSelectedProfile] = useState("londinium")

  const activeProfile = profiles.find((p) => p.id === selectedProfile)

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-foreground">Pressure Profile</span>
        </div>

        <Select value={selectedProfile} onValueChange={setSelectedProfile}>
          <SelectTrigger className="w-full bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {profiles.map((profile) => (
              <SelectItem key={profile.id} value={profile.id}>
                <div className="flex items-center gap-2">
                  {selectedProfile === profile.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                  <span>{profile.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {activeProfile && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground">{activeProfile.description}</p>
            
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-secondary rounded-lg p-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Pre-infusion
                </p>
                <p className="text-sm font-medium text-foreground mt-0.5">
                  {activeProfile.preinfusion}
                </p>
              </div>
              <div className="bg-secondary rounded-lg p-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Pressure
                </p>
                <p className="text-sm font-medium text-foreground mt-0.5">
                  {activeProfile.pressure}
                </p>
              </div>
              <div className="bg-secondary rounded-lg p-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Temp
                </p>
                <p className="text-sm font-medium text-foreground mt-0.5">
                  {activeProfile.temp}
                </p>
              </div>
            </div>

            {selectedProfile !== "custom" && (
              <button className="w-full flex items-center justify-center gap-1 text-xs text-primary hover:underline mt-2">
                Edit profile
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
