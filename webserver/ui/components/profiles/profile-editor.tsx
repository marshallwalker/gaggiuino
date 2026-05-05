"use client"

import { useState, useEffect } from "react"
import { Profile, ControlMode, RampShape } from "@/lib/profile-types"
import { ProfilePreviewChart } from "./profile-preview-chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Save, RotateCcw } from "lucide-react"

interface ProfileEditorProps {
  profile: Profile
  isActive: boolean
  onSave: (profile: Profile) => void
  onCancel: () => void
  onReset: () => void
}

// Field with unit chip
function FieldWithUnit({
  label,
  value,
  unit,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
}: {
  label: string
  value: number
  unit: string
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className="font-mono w-24"
        />
        <Badge variant="outline" className="text-xs font-normal shrink-0">
          {unit}
        </Badge>
      </div>
    </div>
  )
}

// Slider field with unit
function SliderField({
  label,
  value,
  unit,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
}: {
  label: string
  value: number
  unit: string
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm text-muted-foreground">{label}</Label>
        <span className="text-sm font-mono text-foreground">
          {value} <span className="text-muted-foreground">{unit}</span>
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
      />
    </div>
  )
}

export function ProfileEditor({
  profile: initialProfile,
  isActive,
  onSave,
  onCancel,
  onReset,
}: ProfileEditorProps) {
  const [profile, setProfile] = useState<Profile>(initialProfile)
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    setProfile(initialProfile)
    setIsDirty(false)
  }, [initialProfile])

  const updateProfile = <K extends keyof Profile>(key: K, value: Profile[K]) => {
    setProfile((p) => ({ ...p, [key]: value }))
    setIsDirty(true)
  }

  const updatePreinfusion = <K extends keyof Profile["preinfusion"]>(
    key: K,
    value: Profile["preinfusion"][K]
  ) => {
    setProfile((p) => ({
      ...p,
      preinfusion: { ...p.preinfusion, [key]: value },
    }))
    setIsDirty(true)
  }

  const updateSoak = <K extends keyof Profile["soak"]>(
    key: K,
    value: Profile["soak"][K]
  ) => {
    setProfile((p) => ({
      ...p,
      soak: { ...p.soak, [key]: value },
    }))
    setIsDirty(true)
  }

  const updateRamp = <K extends keyof Profile["ramp"]>(
    key: K,
    value: Profile["ramp"][K]
  ) => {
    setProfile((p) => ({
      ...p,
      ramp: { ...p.ramp, [key]: value },
    }))
    setIsDirty(true)
  }

  const updateTransition = <K extends keyof Profile["transition"]>(
    key: K,
    value: Profile["transition"][K]
  ) => {
    setProfile((p) => ({
      ...p,
      transition: { ...p.transition, [key]: value },
    }))
    setIsDirty(true)
  }

  const updateMain = <K extends keyof Profile["main"]>(
    key: K,
    value: Profile["main"][K]
  ) => {
    setProfile((p) => ({
      ...p,
      main: { ...p.main, [key]: value },
    }))
    setIsDirty(true)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">Slot {profile.id + 1}:</span>
            <Input
              value={profile.name}
              onChange={(e) => updateProfile("name", e.target.value.slice(0, 25))}
              className="w-48 font-semibold"
              maxLength={25}
            />
            {isActive && (
              <Badge className="bg-primary/20 text-primary border-primary/30">
                Active
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onReset}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
          <Button size="sm" onClick={() => onSave(profile)} disabled={!isDirty}>
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
        </div>
      </div>

      {/* Live Preview */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Profile Preview</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ProfilePreviewChart profile={profile} />
        </CardContent>
      </Card>

      {/* Editor Tabs */}
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="preinfusion">Preinfusion</TabsTrigger>
          <TabsTrigger value="soak">Soak</TabsTrigger>
          <TabsTrigger value="ramp">Ramp</TabsTrigger>
          <TabsTrigger value="profiling">Profiling</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="mt-4">
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <SliderField
                  label="Brew Temperature"
                  value={profile.brewTemp}
                  unit="°C"
                  onChange={(v) => updateProfile("brewTemp", v)}
                  min={85}
                  max={100}
                  step={0.5}
                />
                <SliderField
                  label="Input Dose"
                  value={profile.inputDose}
                  unit="g"
                  onChange={(v) => updateProfile("inputDose", v)}
                  min={10}
                  max={30}
                  step={0.1}
                />
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-4">
                  <Label>Stop on Weight</Label>
                  <Switch
                    checked={profile.stopOnWeight}
                    onCheckedChange={(v) => updateProfile("stopOnWeight", v)}
                  />
                </div>

                {profile.stopOnWeight && (
                  <div className="grid grid-cols-2 gap-6">
                    <FieldWithUnit
                      label="Target Weight (custom)"
                      value={profile.targetWeight}
                      unit="g"
                      onChange={(v) => updateProfile("targetWeight", v)}
                      min={0}
                      max={100}
                      step={0.1}
                    />
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">
                        Preset Multiplier
                      </Label>
                      <Select
                        value={String(profile.presetMultiplier)}
                        onValueChange={(v) => updateProfile("presetMultiplier", Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1x (Single)</SelectItem>
                          <SelectItem value="2">2x (Double)</SelectItem>
                          <SelectItem value="3">3x (Triple)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Used when target weight {"<"} 1g
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preinfusion Tab */}
        <TabsContent value="preinfusion" className="mt-4">
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Enable Preinfusion</Label>
                <Switch
                  checked={profile.preinfusion.enabled}
                  onCheckedChange={(v) => updatePreinfusion("enabled", v)}
                />
              </div>

              {profile.preinfusion.enabled && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Mode</Label>
                    <Select
                      value={profile.preinfusion.mode}
                      onValueChange={(v) => updatePreinfusion("mode", v as ControlMode)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pressure">Pressure</SelectItem>
                        <SelectItem value="flow">Flow</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {profile.preinfusion.mode === "pressure" ? (
                    <div className="grid grid-cols-2 gap-6 p-4 bg-secondary/50 rounded-lg">
                      <SliderField
                        label="Duration"
                        value={profile.preinfusion.pressureDuration}
                        unit="s"
                        onChange={(v) => updatePreinfusion("pressureDuration", v)}
                        min={1}
                        max={30}
                      />
                      <SliderField
                        label="Pressure"
                        value={profile.preinfusion.pressure}
                        unit="bar"
                        onChange={(v) => updatePreinfusion("pressure", v)}
                        min={0}
                        max={6}
                        step={0.1}
                      />
                      <SliderField
                        label="Flow Cap"
                        value={profile.preinfusion.flowCap}
                        unit="ml/s"
                        onChange={(v) => updatePreinfusion("flowCap", v)}
                        min={0}
                        max={10}
                        step={0.1}
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-6 p-4 bg-secondary/50 rounded-lg">
                      <SliderField
                        label="Duration"
                        value={profile.preinfusion.flowDuration}
                        unit="s"
                        onChange={(v) => updatePreinfusion("flowDuration", v)}
                        min={1}
                        max={60}
                      />
                      <SliderField
                        label="Flow Rate"
                        value={profile.preinfusion.flowRate}
                        unit="ml/s"
                        onChange={(v) => updatePreinfusion("flowRate", v)}
                        min={0}
                        max={6}
                        step={0.1}
                      />
                      <SliderField
                        label="Pressure Cap"
                        value={profile.preinfusion.pressureCap}
                        unit="bar"
                        onChange={(v) => updatePreinfusion("pressureCap", v)}
                        min={0}
                        max={6}
                        step={0.1}
                      />
                    </div>
                  )}

                  <div className="border-t border-border pt-4 space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Stop Conditions</h4>
                    <div className="grid grid-cols-2 gap-6">
                      <FieldWithUnit
                        label="Puck Fill Detection"
                        value={profile.preinfusion.puckFillDetection}
                        unit="g"
                        onChange={(v) => updatePreinfusion("puckFillDetection", v)}
                        min={0}
                        max={5}
                        step={0.1}
                      />
                      <FieldWithUnit
                        label="Stop Early at Weight"
                        value={profile.preinfusion.stopEarlyAtWeight}
                        unit="g"
                        onChange={(v) => updatePreinfusion("stopEarlyAtWeight", v)}
                        min={0}
                        max={20}
                        step={0.1}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Stop Early on Pressure</Label>
                      <Switch
                        checked={profile.preinfusion.stopEarlyOnPressure}
                        onCheckedChange={(v) => updatePreinfusion("stopEarlyOnPressure", v)}
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Soak Tab */}
        <TabsContent value="soak" className="mt-4">
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Enable Soak</Label>
                <Switch
                  checked={profile.soak.enabled}
                  onCheckedChange={(v) => updateSoak("enabled", v)}
                />
              </div>

              {profile.soak.enabled && (
                <>
                  <div className="grid grid-cols-2 gap-6">
                    <SliderField
                      label="Soak Time (Pressure Mode)"
                      value={profile.soak.soakTimePressure}
                      unit="s"
                      onChange={(v) => updateSoak("soakTimePressure", v)}
                      min={0}
                      max={60}
                    />
                    <SliderField
                      label="Soak Time (Flow Mode)"
                      value={profile.soak.soakTimeFlow}
                      unit="s"
                      onChange={(v) => updateSoak("soakTimeFlow", v)}
                      min={0}
                      max={60}
                    />
                    <SliderField
                      label="Maintain Pressure"
                      value={profile.soak.maintainPressure}
                      unit="bar"
                      onChange={(v) => updateSoak("maintainPressure", v)}
                      min={0}
                      max={6}
                      step={0.1}
                    />
                    <SliderField
                      label="Maintain Flow"
                      value={profile.soak.maintainFlow}
                      unit="ml/s"
                      onChange={(v) => updateSoak("maintainFlow", v)}
                      min={0}
                      max={4}
                      step={0.1}
                    />
                  </div>

                  <div className="border-t border-border pt-4">
                    <h4 className="text-sm font-medium text-muted-foreground mb-4">Stop Conditions</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <FieldWithUnit
                        label="Stop Below Pressure"
                        value={profile.soak.stopBelowPressure}
                        unit="bar"
                        onChange={(v) => updateSoak("stopBelowPressure", v)}
                        min={0}
                        max={6}
                        step={0.1}
                      />
                      <FieldWithUnit
                        label="Stop Above Pressure"
                        value={profile.soak.stopAbovePressure}
                        unit="bar"
                        onChange={(v) => updateSoak("stopAbovePressure", v)}
                        min={0}
                        max={12}
                        step={0.1}
                      />
                      <FieldWithUnit
                        label="Stop at Weight"
                        value={profile.soak.stopAtWeight}
                        unit="g"
                        onChange={(v) => updateSoak("stopAtWeight", v)}
                        min={0}
                        max={20}
                        step={0.1}
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ramp Tab */}
        <TabsContent value="ramp" className="mt-4">
          <Card>
            <CardContent className="pt-6 space-y-6">
              <SliderField
                label="Ramp Duration"
                value={profile.ramp.duration}
                unit="s"
                onChange={(v) => updateRamp("duration", v)}
                min={0}
                max={10}
                step={0.5}
              />
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Ramp Shape</Label>
                <Select
                  value={profile.ramp.shape}
                  onValueChange={(v) => updateRamp("shape", v as RampShape)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linear">Linear</SelectItem>
                    <SelectItem value="ease-in">Ease In</SelectItem>
                    <SelectItem value="ease-out">Ease Out</SelectItem>
                    <SelectItem value="s-curve">S-Curve</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profiling Tab */}
        <TabsContent value="profiling" className="mt-4 space-y-4">
          {/* Transition Phase */}
          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Transition Phase</CardTitle>
                <Switch
                  checked={profile.transition.enabled}
                  onCheckedChange={(v) => updateTransition("enabled", v)}
                />
              </div>
            </CardHeader>
            {profile.transition.enabled && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  {/* Pressure Control */}
                  <div className="p-4 bg-secondary/50 rounded-lg space-y-4">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Badge variant="outline">P</Badge> Pressure Control
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <FieldWithUnit
                        label="Start"
                        value={profile.transition.pressureStart}
                        unit="bar"
                        onChange={(v) => updateTransition("pressureStart", v)}
                        min={0}
                        max={12}
                        step={0.1}
                      />
                      <FieldWithUnit
                        label="End"
                        value={profile.transition.pressureEnd}
                        unit="bar"
                        onChange={(v) => updateTransition("pressureEnd", v)}
                        min={0}
                        max={12}
                        step={0.1}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FieldWithUnit
                        label="Hold Duration"
                        value={profile.transition.pressureHoldDuration}
                        unit="s"
                        onChange={(v) => updateTransition("pressureHoldDuration", v)}
                        min={0}
                        max={30}
                      />
                      <FieldWithUnit
                        label="Slope Duration"
                        value={profile.transition.pressureSlopeDuration}
                        unit="s"
                        onChange={(v) => updateTransition("pressureSlopeDuration", v)}
                        min={0}
                        max={30}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Shape</Label>
                        <Select
                          value={profile.transition.pressureSlopeShape}
                          onValueChange={(v) => updateTransition("pressureSlopeShape", v as RampShape)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="linear">Linear</SelectItem>
                            <SelectItem value="ease-in">Ease In</SelectItem>
                            <SelectItem value="ease-out">Ease Out</SelectItem>
                            <SelectItem value="s-curve">S-Curve</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <FieldWithUnit
                        label="Flow Restriction"
                        value={profile.transition.flowRestriction}
                        unit="ml/s"
                        onChange={(v) => updateTransition("flowRestriction", v)}
                        min={0}
                        max={10}
                        step={0.1}
                      />
                    </div>
                  </div>

                  {/* Flow Control */}
                  <div className="p-4 bg-secondary/50 rounded-lg space-y-4">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Badge variant="outline">F</Badge> Flow Control
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <FieldWithUnit
                        label="Start"
                        value={profile.transition.flowStart}
                        unit="ml/s"
                        onChange={(v) => updateTransition("flowStart", v)}
                        min={0}
                        max={6}
                        step={0.1}
                      />
                      <FieldWithUnit
                        label="End"
                        value={profile.transition.flowEnd}
                        unit="ml/s"
                        onChange={(v) => updateTransition("flowEnd", v)}
                        min={0}
                        max={6}
                        step={0.1}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FieldWithUnit
                        label="Hold Duration"
                        value={profile.transition.flowHoldDuration}
                        unit="s"
                        onChange={(v) => updateTransition("flowHoldDuration", v)}
                        min={0}
                        max={30}
                      />
                      <FieldWithUnit
                        label="Slope Duration"
                        value={profile.transition.flowSlopeDuration}
                        unit="s"
                        onChange={(v) => updateTransition("flowSlopeDuration", v)}
                        min={0}
                        max={30}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Shape</Label>
                        <Select
                          value={profile.transition.flowSlopeShape}
                          onValueChange={(v) => updateTransition("flowSlopeShape", v as RampShape)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="linear">Linear</SelectItem>
                            <SelectItem value="ease-in">Ease In</SelectItem>
                            <SelectItem value="ease-out">Ease Out</SelectItem>
                            <SelectItem value="s-curve">S-Curve</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <FieldWithUnit
                        label="Pressure Restriction"
                        value={profile.transition.pressureRestriction}
                        unit="bar"
                        onChange={(v) => updateTransition("pressureRestriction", v)}
                        min={0}
                        max={12}
                        step={0.1}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Main Phase */}
          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Main Phase</CardTitle>
                <Switch
                  checked={profile.main.enabled}
                  onCheckedChange={(v) => updateMain("enabled", v)}
                />
              </div>
            </CardHeader>
            {profile.main.enabled && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  {/* Pressure Control */}
                  <div className="p-4 bg-secondary/50 rounded-lg space-y-4">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Badge variant="outline">P</Badge> Pressure Control
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <FieldWithUnit
                        label="Start"
                        value={profile.main.pressureStart}
                        unit="bar"
                        onChange={(v) => updateMain("pressureStart", v)}
                        min={0}
                        max={12}
                        step={0.1}
                      />
                      <FieldWithUnit
                        label="End"
                        value={profile.main.pressureEnd}
                        unit="bar"
                        onChange={(v) => updateMain("pressureEnd", v)}
                        min={0}
                        max={12}
                        step={0.1}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FieldWithUnit
                        label="Slope Duration"
                        value={profile.main.pressureSlopeDuration}
                        unit="s"
                        onChange={(v) => updateMain("pressureSlopeDuration", v)}
                        min={0}
                        max={60}
                      />
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Shape</Label>
                        <Select
                          value={profile.main.pressureSlopeShape}
                          onValueChange={(v) => updateMain("pressureSlopeShape", v as RampShape)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="linear">Linear</SelectItem>
                            <SelectItem value="ease-in">Ease In</SelectItem>
                            <SelectItem value="ease-out">Ease Out</SelectItem>
                            <SelectItem value="s-curve">S-Curve</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <FieldWithUnit
                      label="Flow Restriction"
                      value={profile.main.flowRestriction}
                      unit="ml/s"
                      onChange={(v) => updateMain("flowRestriction", v)}
                      min={0}
                      max={10}
                      step={0.1}
                    />
                  </div>

                  {/* Flow Control */}
                  <div className="p-4 bg-secondary/50 rounded-lg space-y-4">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Badge variant="outline">F</Badge> Flow Control
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <FieldWithUnit
                        label="Start"
                        value={profile.main.flowStart}
                        unit="ml/s"
                        onChange={(v) => updateMain("flowStart", v)}
                        min={0}
                        max={6}
                        step={0.1}
                      />
                      <FieldWithUnit
                        label="End"
                        value={profile.main.flowEnd}
                        unit="ml/s"
                        onChange={(v) => updateMain("flowEnd", v)}
                        min={0}
                        max={6}
                        step={0.1}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FieldWithUnit
                        label="Slope Duration"
                        value={profile.main.flowSlopeDuration}
                        unit="s"
                        onChange={(v) => updateMain("flowSlopeDuration", v)}
                        min={0}
                        max={60}
                      />
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Shape</Label>
                        <Select
                          value={profile.main.flowSlopeShape}
                          onValueChange={(v) => updateMain("flowSlopeShape", v as RampShape)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="linear">Linear</SelectItem>
                            <SelectItem value="ease-in">Ease In</SelectItem>
                            <SelectItem value="ease-out">Ease Out</SelectItem>
                            <SelectItem value="s-curve">S-Curve</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <FieldWithUnit
                      label="Pressure Restriction"
                      value={profile.main.pressureRestriction}
                      unit="bar"
                      onChange={(v) => updateMain("pressureRestriction", v)}
                      min={0}
                      max={12}
                      step={0.1}
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
