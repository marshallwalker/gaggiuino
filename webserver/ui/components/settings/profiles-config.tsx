"use client"

import { useState } from "react"
import {
  Layers,
  Plus,
  Pencil,
  Trash2,
  Share2,
  Download,
  Copy,
  Check,
  X,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export interface Profile {
  id: string
  name: string
  description: string
  preinfusionTime: number
  preinfusionPressure: number
  extractionPressure: number
  temperature: number
  targetWeight: number
  isBuiltIn?: boolean
}

const defaultProfiles: Profile[] = [
  {
    id: "londinium",
    name: "Londinium",
    description: "Long preinfusion, lever-style pressure profile",
    preinfusionTime: 10,
    preinfusionPressure: 2,
    extractionPressure: 7,
    temperature: 93,
    targetWeight: 36,
    isBuiltIn: true,
  },
  {
    id: "la-marzocco",
    name: "La Marzocco",
    description: "Classic Italian flat 9 bar profile",
    preinfusionTime: 4,
    preinfusionPressure: 3,
    extractionPressure: 9,
    temperature: 93,
    targetWeight: 36,
    isBuiltIn: true,
  },
  {
    id: "slayer",
    name: "Slayer",
    description: "Extended preinfusion with slow ramp",
    preinfusionTime: 18,
    preinfusionPressure: 2,
    extractionPressure: 6,
    temperature: 92,
    targetWeight: 40,
    isBuiltIn: true,
  },
  {
    id: "blooming",
    name: "Blooming",
    description: "Turbo-style with bloom phase",
    preinfusionTime: 30,
    preinfusionPressure: 1.5,
    extractionPressure: 4,
    temperature: 90,
    targetWeight: 45,
    isBuiltIn: true,
  },
]

// Simulated share codes storage
const sharedProfiles: Record<string, Profile> = {}

function generateShareCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export function ProfilesConfig() {
  const [profiles, setProfiles] = useState<Profile[]>(defaultProfiles)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [deletingProfile, setDeletingProfile] = useState<Profile | null>(null)
  const [shareCode, setShareCode] = useState("")
  const [importCode, setImportCode] = useState("")
  const [importError, setImportError] = useState("")
  const [copied, setCopied] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Form state
  const [formData, setFormData] = useState<Omit<Profile, "id" | "isBuiltIn">>({
    name: "",
    description: "",
    preinfusionTime: 5,
    preinfusionPressure: 2,
    extractionPressure: 9,
    temperature: 93,
    targetWeight: 36,
  })

  const handleCreate = () => {
    setIsCreating(true)
    setEditingProfile(null)
    setFormData({
      name: "",
      description: "",
      preinfusionTime: 5,
      preinfusionPressure: 2,
      extractionPressure: 9,
      temperature: 93,
      targetWeight: 36,
    })
    setEditDialogOpen(true)
  }

  const handleEdit = (profile: Profile) => {
    setIsCreating(false)
    setEditingProfile(profile)
    setFormData({
      name: profile.name,
      description: profile.description,
      preinfusionTime: profile.preinfusionTime,
      preinfusionPressure: profile.preinfusionPressure,
      extractionPressure: profile.extractionPressure,
      temperature: profile.temperature,
      targetWeight: profile.targetWeight,
    })
    setEditDialogOpen(true)
  }

  const handleSave = () => {
    if (isCreating) {
      const newProfile: Profile = {
        id: `custom-${Date.now()}`,
        ...formData,
        isBuiltIn: false,
      }
      setProfiles([...profiles, newProfile])
    } else if (editingProfile) {
      setProfiles(
        profiles.map((p) =>
          p.id === editingProfile.id
            ? { ...p, ...formData }
            : p
        )
      )
    }
    setEditDialogOpen(false)
  }

  const handleDelete = (profile: Profile) => {
    setDeletingProfile(profile)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (deletingProfile) {
      setProfiles(profiles.filter((p) => p.id !== deletingProfile.id))
    }
    setDeleteDialogOpen(false)
    setDeletingProfile(null)
  }

  const handleShare = (profile: Profile) => {
    const code = generateShareCode()
    sharedProfiles[code] = { ...profile, id: `shared-${Date.now()}`, isBuiltIn: false }
    setShareCode(code)
    setShareDialogOpen(true)
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(shareCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleImport = () => {
    const code = importCode.toUpperCase().trim()
    const profile = sharedProfiles[code]
    
    if (!profile) {
      setImportError("Invalid code. Please check and try again.")
      return
    }

    // Check if profile already exists
    if (profiles.some((p) => p.name === profile.name)) {
      const importedProfile = {
        ...profile,
        id: `imported-${Date.now()}`,
        name: `${profile.name} (Imported)`,
      }
      setProfiles([...profiles, importedProfile])
    } else {
      setProfiles([...profiles, { ...profile, id: `imported-${Date.now()}` }])
    }

    setImportDialogOpen(false)
    setImportCode("")
    setImportError("")
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold text-foreground">
              Pressure Profiles
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setImportCode("")
                setImportError("")
                setImportDialogOpen(true)
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              New Profile
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className="flex items-start justify-between p-4 bg-secondary rounded-lg"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-foreground truncate">
                  {profile.name}
                </h3>
                {profile.isBuiltIn && (
                  <Badge variant="secondary" className="text-[10px]">
                    Built-in
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {profile.description}
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">
                  Pre: {profile.preinfusionTime}s @ {profile.preinfusionPressure} bar
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Extract: {profile.extractionPressure} bar
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {profile.temperature}°C
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {profile.targetWeight}g
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-1 ml-4">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleShare(profile)}
                title="Share profile"
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleEdit(profile)}
                title="Edit profile"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              {!profile.isBuiltIn && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(profile)}
                  title="Delete profile"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}

        {profiles.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Layers className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No profiles yet</p>
            <p className="text-sm">Create your first pressure profile</p>
          </div>
        )}
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isCreating ? "Create Profile" : "Edit Profile"}
            </DialogTitle>
            <DialogDescription>
              {isCreating
                ? "Create a new pressure profile for your espresso shots."
                : "Modify the settings for this profile."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="My Custom Profile"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe this profile..."
                rows={2}
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Preinfusion Time</Label>
                  <span className="text-sm font-medium tabular-nums">
                    {formData.preinfusionTime}s
                  </span>
                </div>
                <Slider
                  value={[formData.preinfusionTime]}
                  onValueChange={([v]) =>
                    setFormData({ ...formData, preinfusionTime: v })
                  }
                  min={0}
                  max={45}
                  step={1}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Preinfusion Pressure</Label>
                  <span className="text-sm font-medium tabular-nums">
                    {formData.preinfusionPressure} bar
                  </span>
                </div>
                <Slider
                  value={[formData.preinfusionPressure]}
                  onValueChange={([v]) =>
                    setFormData({ ...formData, preinfusionPressure: v })
                  }
                  min={0.5}
                  max={6}
                  step={0.5}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Extraction Pressure</Label>
                  <span className="text-sm font-medium tabular-nums">
                    {formData.extractionPressure} bar
                  </span>
                </div>
                <Slider
                  value={[formData.extractionPressure]}
                  onValueChange={([v]) =>
                    setFormData({ ...formData, extractionPressure: v })
                  }
                  min={3}
                  max={12}
                  step={0.5}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Temperature</Label>
                  <span className="text-sm font-medium tabular-nums">
                    {formData.temperature}°C
                  </span>
                </div>
                <Slider
                  value={[formData.temperature]}
                  onValueChange={([v]) =>
                    setFormData({ ...formData, temperature: v })
                  }
                  min={85}
                  max={98}
                  step={0.5}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Target Weight</Label>
                  <span className="text-sm font-medium tabular-nums">
                    {formData.targetWeight}g
                  </span>
                </div>
                <Slider
                  value={[formData.targetWeight]}
                  onValueChange={([v]) =>
                    setFormData({ ...formData, targetWeight: v })
                  }
                  min={20}
                  max={60}
                  step={1}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formData.name.trim()}>
              {isCreating ? "Create" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Profile</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingProfile?.name}&quot;? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Profile</DialogTitle>
            <DialogDescription>
              Share this code with others to let them import your profile.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="flex items-center justify-center gap-2">
              <div className="text-3xl font-mono font-bold tracking-[0.3em] bg-secondary px-6 py-4 rounded-lg text-foreground">
                {shareCode}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyCode}
                className="h-14 w-14"
              >
                {copied ? (
                  <Check className="h-5 w-5 text-primary" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </Button>
            </div>
            <p className="text-center text-sm text-muted-foreground mt-4">
              This code expires after 24 hours
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShareDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Profile</DialogTitle>
            <DialogDescription>
              Enter a share code to download a profile.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="import-code">Share Code</Label>
              <Input
                id="import-code"
                value={importCode}
                onChange={(e) => {
                  setImportCode(e.target.value.toUpperCase())
                  setImportError("")
                }}
                placeholder="XXXXXX"
                className="text-center text-xl font-mono tracking-[0.2em] uppercase"
                maxLength={6}
                autoFocus
              />
              {importError && (
                <p className="text-sm text-destructive">{importError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setImportDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={importCode.length !== 6}
            >
              <Download className="h-4 w-4 mr-2" />
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
