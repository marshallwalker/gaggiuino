"use client"

import { useState, useEffect } from "react"
import { Activity, Share2, Download, Copy, Check, Link } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts"

interface DataPoint {
  time: number
  pressure: number
  flow: number
  weight: number
}

interface ShotData {
  id: string
  timestamp: string
  profile: string
  duration: number
  peakPressure: number
  avgFlow: number
  yield: number
  data: DataPoint[]
}

export function ShotGraph() {
  const [data, setData] = useState<DataPoint[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [shareCode, setShareCode] = useState("")
  const [shareLink, setShareLink] = useState("")
  const [importCode, setImportCode] = useState("")
  const [copied, setCopied] = useState<"code" | "link" | null>(null)
  const [importError, setImportError] = useState("")

  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        setData((prev) => {
          const time = prev.length * 0.5
          if (time > 40) {
            setIsRecording(false)
            return prev
          }

          // Simulate realistic espresso extraction curves
          let pressure = 0
          let flow = 0
          let weight = 0

          if (time < 5) {
            // Preinfusion
            pressure = time * 0.6
            flow = time * 0.3
            weight = time * 0.5
          } else if (time < 8) {
            // Ramp up
            pressure = 3 + (time - 5) * 2
            flow = 1.5 + (time - 5) * 0.8
            weight = 2.5 + (time - 5) * 2
          } else if (time < 30) {
            // Extraction
            pressure = 9 - (time - 8) * 0.05 + (Math.random() - 0.5) * 0.3
            flow = 4 - (time - 8) * 0.05 + (Math.random() - 0.5) * 0.2
            weight = 8.5 + (time - 8) * 1.2
          } else {
            // Decline
            pressure = Math.max(0, 7.9 - (time - 30) * 0.8)
            flow = Math.max(0, 2.9 - (time - 30) * 0.3)
            weight = Math.min(40, 35 + (time - 30) * 0.5)
          }

          return [
            ...prev,
            {
              time: parseFloat(time.toFixed(1)),
              pressure: parseFloat(pressure.toFixed(1)),
              flow: parseFloat(flow.toFixed(1)),
              weight: parseFloat(weight.toFixed(1)),
            },
          ]
        })
      }, 500)
      return () => clearInterval(interval)
    }
  }, [isRecording])

  const handleToggle = () => {
    if (isRecording) {
      setIsRecording(false)
    } else {
      setData([])
      setIsRecording(true)
    }
  }

  const generateShareCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    let code = ""
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  const handleShare = () => {
    if (data.length === 0) return
    
    const code = generateShareCode()
    setShareCode(code)
    setShareLink(`${window.location.origin}/shot/${code}`)
    setCopied(null)
    setShareDialogOpen(true)

    // In a real app, this would upload the shot data to a server
    const shotData: ShotData = {
      id: code,
      timestamp: new Date().toISOString(),
      profile: "Custom",
      duration: data[data.length - 1]?.time || 0,
      peakPressure: Math.max(...data.map((d) => d.pressure)),
      avgFlow: data.reduce((a, b) => a + b.flow, 0) / data.length,
      yield: data[data.length - 1]?.weight || 0,
      data: data,
    }
    console.log("Shot data to share:", shotData)
  }

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(shareCode)
    setCopied("code")
    setTimeout(() => setCopied(null), 2000)
  }

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareLink)
    setCopied("link")
    setTimeout(() => setCopied(null), 2000)
  }

  const handleImport = () => {
    if (!importCode.trim()) {
      setImportError("Please enter a share code")
      return
    }

    // In a real app, this would fetch the shot data from a server
    // For demo purposes, we'll generate sample data
    if (importCode.length === 8) {
      const importedData: DataPoint[] = []
      for (let t = 0; t <= 35; t += 0.5) {
        let pressure = 0
        let flow = 0
        let weight = 0

        if (t < 5) {
          pressure = t * 0.5
          flow = t * 0.25
          weight = t * 0.4
        } else if (t < 8) {
          pressure = 2.5 + (t - 5) * 2.2
          flow = 1.25 + (t - 5) * 0.9
          weight = 2 + (t - 5) * 2.2
        } else if (t < 30) {
          pressure = 9.1 - (t - 8) * 0.04
          flow = 3.95 - (t - 8) * 0.04
          weight = 8.6 + (t - 8) * 1.15
        } else {
          pressure = Math.max(0, 8.2 - (t - 30) * 0.9)
          flow = Math.max(0, 3.0 - (t - 30) * 0.35)
          weight = Math.min(38, 33.9 + (t - 30) * 0.6)
        }

        importedData.push({
          time: parseFloat(t.toFixed(1)),
          pressure: parseFloat(pressure.toFixed(1)),
          flow: parseFloat(flow.toFixed(1)),
          weight: parseFloat(weight.toFixed(1)),
        })
      }
      setData(importedData)
      setImportDialogOpen(false)
      setImportCode("")
      setImportError("")
    } else {
      setImportError("Invalid share code. Codes are 8 characters.")
    }
  }

  const hasData = data.length > 0 && !isRecording

  return (
    <Card className="bg-card border-border col-span-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-foreground">Shot Graph</span>
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
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Import
            </Button>
            {hasData && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
              >
                <Share2 className="h-3.5 w-3.5 mr-1.5" />
                Share
              </Button>
            )}
            <Button
              variant={isRecording ? "destructive" : "default"}
              size="sm"
              onClick={handleToggle}
            >
              {isRecording ? "Stop Recording" : "Start Demo"}
            </Button>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="time"
                className="text-muted-foreground"
                tick={{ fill: "oklch(0.65 0 0)" }}
                stroke="oklch(0.65 0 0)"
                fontSize={10}
                tickFormatter={(v) => `${v}s`}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: "oklch(0.65 0 0)" }}
                stroke="oklch(0.65 0 0)"
                fontSize={10}
                domain={[0, 12]}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: "oklch(0.65 0 0)" }}
                stroke="oklch(0.65 0 0)"
                fontSize={10}
                domain={[0, 45]}
              />
              <Legend
                wrapperStyle={{ fontSize: "10px", color: "oklch(0.95 0 0)" }}
                formatter={(value) => (
                  <span style={{ color: "oklch(0.95 0 0)" }}>{value}</span>
                )}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="pressure"
                name="Pressure (bar)"
                stroke="oklch(0.65 0.15 145)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="flow"
                name="Flow (ml/s)"
                stroke="oklch(0.6 0.15 200)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="weight"
                name="Weight (g)"
                stroke="oklch(0.7 0.15 50)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {hasData && (
          <div className="mt-4 pt-3 border-t border-border grid grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="text-sm font-medium text-foreground">
                {data[data.length - 1]?.time.toFixed(1)}s
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Peak Pressure</p>
              <p className="text-sm font-medium text-foreground">
                {Math.max(...data.map((d) => d.pressure)).toFixed(1)} bar
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Flow</p>
              <p className="text-sm font-medium text-foreground">
                {(data.reduce((a, b) => a + b.flow, 0) / data.length).toFixed(1)} ml/s
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Yield</p>
              <p className="text-sm font-medium text-foreground">
                {data[data.length - 1]?.weight.toFixed(1)}g
              </p>
            </div>
          </div>
        )}
      </CardContent>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Shot Profile</DialogTitle>
            <DialogDescription>
              Share this shot with others using the code or link below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Share Code</Label>
              <div className="flex gap-2">
                <Input
                  value={shareCode}
                  readOnly
                  className="font-mono text-lg tracking-widest text-center"
                />
                <Button variant="outline" size="icon" onClick={handleCopyCode}>
                  {copied === "code" ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Share Link</Label>
              <div className="flex gap-2">
                <Input
                  value={shareLink}
                  readOnly
                  className="text-sm"
                />
                <Button variant="outline" size="icon" onClick={handleCopyLink}>
                  {copied === "link" ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Link className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="pt-2 text-xs text-muted-foreground">
              <p>Shot summary: {data[data.length - 1]?.time.toFixed(1)}s duration, {data[data.length - 1]?.weight.toFixed(1)}g yield, {Math.max(...data.map((d) => d.pressure)).toFixed(1)} bar peak</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Shot Profile</DialogTitle>
            <DialogDescription>
              Enter a share code to import a shot profile from another user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="import-code">Share Code</Label>
              <Input
                id="import-code"
                value={importCode}
                onChange={(e) => {
                  setImportCode(e.target.value.toUpperCase())
                  setImportError("")
                }}
                placeholder="Enter 8-character code"
                className="font-mono text-lg tracking-widest text-center uppercase"
                maxLength={8}
                autoFocus
              />
              {importError && (
                <p className="text-sm text-destructive">{importError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport}>
              Import Shot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
