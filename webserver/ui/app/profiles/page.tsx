"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Coffee, Home, Settings, Sliders } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Profile,
  createDefaultProfile,
  profileFromApi,
  profileToApi,
} from "@/lib/profile-types"
import { ProfileList } from "@/components/profiles/profile-list"
import { ProfileEditor } from "@/components/profiles/profile-editor"
import { useSensorData } from "@/hooks/use-sensor-data"
import {
  getProfile,
  getProfileNames,
  setProfile as apiSetProfile,
  setActiveProfile as apiSetActiveProfile,
} from "@/lib/profiles-client"

export default function ProfilesPage() {
  const sensor = useSensorData()
  // Active slot is owned by the firmware. sensor.activeProfile is 1-indexed
  // and arrives via the WS sensor stream. Defaults to 0 (slot 1) before the
  // first frame lands.
  const activeSlot = Math.max(0, (sensor.activeProfile || 1) - 1)

  const [profiles, setProfiles] = useState<Profile[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingSlot, setEditingSlot] = useState<number | null>(null)
  const [, setSwitching] = useState(false)

  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false)
  const [duplicateSource, setDuplicateSource] = useState<number | null>(null)
  const [duplicateTarget, setDuplicateTarget] = useState<string>("")

  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resetSlot, setResetSlot] = useState<number | null>(null)

  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importSlot, setImportSlot] = useState<number | null>(null)
  const [importJson, setImportJson] = useState("")
  const [importError, setImportError] = useState("")

  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportJson, setExportJson] = useState("")

  // Initial load — fetch all 5 profiles in parallel. The ESP caches per-index
  // so the first call after boot pays one round-trip per slot, subsequent
  // re-renders are instant.
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const summaries = await getProfileNames()
        const detailFetches = summaries.map((s) =>
          getProfile(s.index).catch(() => null),
        )
        const details = await Promise.all(detailFetches)
        if (cancelled) return
        const merged = summaries.map((s, i) => {
          const d = details[i]
          return d
            ? profileFromApi(d, s.name)
            : createDefaultProfile(s.index - 1, s.name || `Slot ${s.index}`)
        })
        setProfiles(merged)
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Failed to load profiles")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  // Real handler: activate via PUT /api/profiles/active. The next sensor
  // frame catches up automatically and re-renders with the new active slot.
  async function handleSetActive(slotId: number) {
    if (slotId === activeSlot) return
    setSwitching(true)
    try {
      await apiSetActiveProfile(slotId + 1)
      toast.success(`Switched to slot ${slotId + 1}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Switch failed")
    } finally {
      setSwitching(false)
    }
  }

  const handleEdit = (slotId: number) => setEditingSlot(slotId)

  // Persist the profile through PUT /api/profiles/{idx}. The endpoint echoes
  // back the actually-stored snapshot (post any STM-side clamping) so we
  // re-derive the UI Profile from that response instead of trusting the
  // optimistic in-memory copy.
  async function persistProfile(updated: Profile, opts: { successMessage?: string } = {}) {
    try {
      const echoed = await apiSetProfile(updated.id + 1, profileToApi(updated))
      const reconciled = profileFromApi(echoed, updated.name)
      setProfiles((prev) =>
        (prev ?? []).map((p) => (p.id === reconciled.id ? reconciled : p)),
      )
      toast.success(opts.successMessage ?? `Saved ${reconciled.name}`)
      return true
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed")
      return false
    }
  }

  const handleSave = async (updatedProfile: Profile) => {
    const ok = await persistProfile(updatedProfile)
    if (ok) setEditingSlot(null)
  }

  const handleDuplicate = (sourceId: number) => {
    setDuplicateSource(sourceId)
    setDuplicateTarget("")
    setDuplicateDialogOpen(true)
  }

  const confirmDuplicate = async () => {
    if (!profiles || duplicateSource === null || !duplicateTarget) {
      setDuplicateDialogOpen(false)
      return
    }
    const targetId = parseInt(duplicateTarget)
    const sourceProfile = profiles.find((p) => p.id === duplicateSource)
    setDuplicateDialogOpen(false)
    if (!sourceProfile) return
    await persistProfile(
      { ...sourceProfile, id: targetId, name: `${sourceProfile.name} Copy` },
      { successMessage: `Copied to slot ${targetId + 1}` },
    )
  }

  const handleReset = (slotId: number) => {
    setResetSlot(slotId)
    setResetDialogOpen(true)
  }

  const confirmReset = async () => {
    if (resetSlot === null) {
      setResetDialogOpen(false)
      return
    }
    const slotId = resetSlot
    setResetDialogOpen(false)
    const ok = await persistProfile(
      createDefaultProfile(slotId, `Slot ${slotId + 1}`),
      { successMessage: `Reset slot ${slotId + 1}` },
    )
    if (ok && editingSlot === slotId) setEditingSlot(null)
  }

  const handleExport = (slotId: number) => {
    if (!profiles) return
    const profile = profiles.find((p) => p.id === slotId)
    if (profile) {
      setExportJson(JSON.stringify(profile, null, 2))
      setExportDialogOpen(true)
    }
  }

  const handleImport = (slotId: number) => {
    setImportSlot(slotId)
    setImportJson("")
    setImportError("")
    setImportDialogOpen(true)
  }

  const confirmImport = async () => {
    if (importSlot === null) return
    let parsed: Profile
    try {
      parsed = JSON.parse(importJson) as Profile
      if (!parsed.name || typeof parsed.brewTemp !== "number") {
        throw new Error("Invalid profile format")
      }
    } catch {
      setImportError("Invalid JSON format. Please check and try again.")
      return
    }
    const slotId = importSlot
    setImportDialogOpen(false)
    await persistProfile(
      { ...parsed, id: slotId },
      { successMessage: `Imported into slot ${slotId + 1}` },
    )
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(exportJson)
      toast.success("Copied to clipboard")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Clipboard write failed")
    }
  }

  const editingProfile =
    editingSlot !== null && profiles ? profiles.find((p) => p.id === editingSlot) : null

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
              <p className="text-sm text-muted-foreground">Profile Manager</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/">
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </Link>
              </Button>
              <div className="flex items-center gap-2 text-primary px-3 py-1.5 bg-primary/10 rounded-md">
                <Sliders className="h-4 w-4" />
                <span className="text-sm font-medium">Profiles</span>
              </div>
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
      <main className="max-w-4xl mx-auto px-4 py-6">
        {editingProfile ? (
          <ProfileEditor
            profile={editingProfile}
            isActive={editingSlot === activeSlot}
            onSave={handleSave}
            onCancel={() => setEditingSlot(null)}
            onReset={() => handleReset(editingSlot!)}
          />
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Brew Profiles</h2>
              <p className="text-muted-foreground mt-1">
                5 profile slots stored in firmware. Select, edit, or duplicate profiles.
              </p>
            </div>

            {loading || !profiles ? (
              <div className="text-center text-muted-foreground py-12">Loading profiles…</div>
            ) : (
              <ProfileList
                profiles={profiles}
                activeSlot={activeSlot}
                onSetActive={handleSetActive}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onReset={handleReset}
                onExport={handleExport}
                onImport={handleImport}
              />
            )}
          </div>
        )}
      </main>

      {/* Duplicate Dialog */}
      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Profile</DialogTitle>
            <DialogDescription>
              Copy &quot;{profiles?.find((p) => p.id === duplicateSource)?.name}&quot; to another slot.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Target Slot</Label>
            <Select value={duplicateTarget} onValueChange={setDuplicateTarget}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select slot..." />
              </SelectTrigger>
              <SelectContent>
                {(profiles ?? [])
                  .filter((p) => p.id !== duplicateSource)
                  .map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      Slot {p.id + 1}: {p.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmDuplicate} disabled={!duplicateTarget}>
              Duplicate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to Defaults?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset &quot;{profiles?.find((p) => p.id === resetSlot)?.name}&quot; to factory
              defaults locally. This action cannot be undone in the current session.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReset}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Export Profile</DialogTitle>
            <DialogDescription>Copy this JSON to share your profile.</DialogDescription>
          </DialogHeader>
          <Textarea value={exportJson} readOnly className="font-mono text-xs h-64" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={copyToClipboard}>Copy to Clipboard</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Profile</DialogTitle>
            <DialogDescription>
              Paste profile JSON to import into slot {importSlot !== null ? importSlot + 1 : ""}.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={importJson}
            onChange={(e) => {
              setImportJson(e.target.value)
              setImportError("")
            }}
            placeholder="Paste JSON here..."
            className="font-mono text-xs h-64"
          />
          {importError && <p className="text-sm text-destructive">{importError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmImport} disabled={!importJson}>
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
