"use client"

import { Profile, getPreinfusionSummary, getExtractionSummary } from "@/lib/profile-types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Play, 
  Pencil, 
  Copy, 
  RotateCcw, 
  Download, 
  Upload, 
  MoreVertical,
  Thermometer,
  Scale,
  Coffee
} from "lucide-react"

interface ProfileListProps {
  profiles: Profile[]
  activeSlot: number
  onSetActive: (slotId: number) => void
  onEdit: (slotId: number) => void
  onDuplicate: (sourceId: number) => void
  onReset: (slotId: number) => void
  onExport: (slotId: number) => void
  onImport: (slotId: number) => void
}

export function ProfileList({
  profiles,
  activeSlot,
  onSetActive,
  onEdit,
  onDuplicate,
  onReset,
  onExport,
  onImport,
}: ProfileListProps) {
  return (
    <div className="space-y-3">
      {profiles.map((profile) => {
        const isActive = profile.id === activeSlot
        const brewRatio = profile.stopOnWeight && profile.targetWeight >= 1
          ? `1:${(profile.targetWeight / profile.inputDose).toFixed(1)}`
          : `1:${profile.presetMultiplier}`

        return (
          <Card
            key={profile.id}
            className={`transition-colors ${
              isActive 
                ? "border-primary bg-primary/5" 
                : "hover:border-muted-foreground/30"
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {/* Slot indicator */}
                <div className={`flex items-center justify-center w-8 h-8 rounded-md text-sm font-mono font-semibold ${
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-secondary text-muted-foreground"
                }`}>
                  {profile.id + 1}
                </div>

                {/* Profile info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-foreground truncate">
                      {profile.name}
                    </h3>
                    {isActive && (
                      <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                        Active
                      </Badge>
                    )}
                  </div>

                  {/* Stats row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Thermometer className="h-3.5 w-3.5" />
                      <span className="font-mono">{profile.brewTemp}°C</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Scale className="h-3.5 w-3.5" />
                      <span className="font-mono">{profile.inputDose}g</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Coffee className="h-3.5 w-3.5" />
                      <span className="font-mono">{brewRatio}</span>
                    </span>
                  </div>

                  {/* Phase summaries */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline" className="text-xs font-normal">
                      PI: {getPreinfusionSummary(profile.preinfusion)}
                    </Badge>
                    <Badge variant="outline" className="text-xs font-normal">
                      {getExtractionSummary(profile)}
                    </Badge>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {!isActive && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSetActive(profile.id)}
                      className="text-muted-foreground hover:text-primary"
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Activate
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(profile.id)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onDuplicate(profile.id)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate to...
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onExport(profile.id)}>
                        <Download className="h-4 w-4 mr-2" />
                        Export JSON
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onImport(profile.id)}>
                        <Upload className="h-4 w-4 mr-2" />
                        Import JSON
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => onReset(profile.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset to Defaults
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
