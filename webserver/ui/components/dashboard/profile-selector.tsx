"use client"

import { useEffect, useState } from "react"
import { Layers, Check } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSensorData } from "@/hooks/use-sensor-data"
import {
  getProfile,
  getProfileNames,
  setActiveProfile,
  type ProfileData,
  type ProfileSummary,
} from "@/lib/profiles-client"

export function ProfileSelector() {
  const sensor = useSensorData()
  const [names, setNames] = useState<ProfileSummary[]>([])
  const [namesLoading, setNamesLoading] = useState(true)
  const [activeData, setActiveData] = useState<ProfileData | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [switching, setSwitching] = useState(false)

  // The active index lives in the sensor stream (1-indexed). We render the
  // detail card based on this rather than a local "selectedProfile" state so
  // out-of-band switches (Nextion tap, another browser tab) reflect here too.
  const activeIndex = sensor.activeProfile

  useEffect(() => {
    let cancelled = false
    getProfileNames()
      .then((list) => {
        if (!cancelled) setNames(list)
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Failed to load profiles")
      })
      .finally(() => {
        if (!cancelled) setNamesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Refetch the active profile's detail whenever the active index changes.
  // The ESP caches per-index, so subsequent re-selections of the same
  // profile are instant.
  useEffect(() => {
    if (!activeIndex || activeIndex < 1 || activeIndex > 5) return
    let cancelled = false
    setDetailLoading(true)
    getProfile(activeIndex)
      .then((data) => {
        if (!cancelled) setActiveData(data)
      })
      .catch((e) => {
        if (!cancelled) {
          setActiveData(null)
          toast.error(e instanceof Error ? e.message : "Failed to load profile detail")
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeIndex])

  async function handleSelect(value: string) {
    const idx = parseInt(value, 10)
    if (!Number.isFinite(idx) || idx === activeIndex) return
    setSwitching(true)
    try {
      await setActiveProfile(idx)
      // sensor.activeProfile catches up on the next WS frame; the useEffect
      // above refetches detail when it does.
      toast.success(`Switched to profile ${idx}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Switch failed")
    } finally {
      setSwitching(false)
    }
  }

  // Brew ratio: target weight ÷ dose. Only meaningful when the profile
  // actually stops on weight; otherwise the target field is unused.
  const ratio =
    activeData && activeData.stopOnWeightState && activeData.shotDose > 0
      ? (activeData.shotStopOnCustomWeight / activeData.shotDose).toFixed(1)
      : null

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-foreground">Brew Profile</span>
        </div>

        <Select
          value={activeIndex ? String(activeIndex) : undefined}
          onValueChange={handleSelect}
          disabled={namesLoading || switching || names.length === 0}
        >
          <SelectTrigger className="w-full bg-secondary border-border">
            <SelectValue placeholder={namesLoading ? "Loading…" : "Select a profile"} />
          </SelectTrigger>
          <SelectContent>
            {names.map((p) => (
              <SelectItem key={p.index} value={String(p.index)}>
                <div className="flex items-center gap-2">
                  {p.index === activeIndex && <Check className="h-4 w-4 text-primary" />}
                  <span>{p.name || `Profile ${p.index}`}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {activeData && !detailLoading && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-secondary rounded-lg p-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Pre-infusion
                </p>
                <p className="text-sm font-medium text-foreground mt-0.5">
                  {activeData.preinfusionSec > 0
                    ? `${activeData.preinfusionSec}s @ ${activeData.preinfusionBar.toFixed(1)} bar`
                    : "Off"}
                </p>
              </div>
              <div className="bg-secondary rounded-lg p-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Temp</p>
                <p className="text-sm font-medium text-foreground mt-0.5">
                  {activeData.setpoint}°C
                </p>
              </div>
              <div className="bg-secondary rounded-lg p-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Dose</p>
                <p className="text-sm font-medium text-foreground mt-0.5">
                  {activeData.shotDose > 0 ? `${activeData.shotDose.toFixed(1)} g` : "—"}
                </p>
              </div>
            </div>

            {activeData.stopOnWeightState && (
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-secondary rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Target Weight
                  </p>
                  <p className="text-sm font-medium text-foreground mt-0.5">
                    {activeData.shotStopOnCustomWeight.toFixed(1)} g
                  </p>
                </div>
                <div className="bg-secondary rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Brew Ratio
                  </p>
                  <p className="text-sm font-medium text-foreground mt-0.5">
                    {ratio ? `1 : ${ratio}` : "—"}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {detailLoading && (
          <p className="mt-4 text-xs text-muted-foreground text-center">Loading profile…</p>
        )}
      </CardContent>
    </Card>
  )
}
