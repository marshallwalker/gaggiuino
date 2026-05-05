"use client"

import { useEffect, useState } from "react"
import { Wifi, WifiOff, Eye, EyeOff, RefreshCw, Check } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  connectToWifi,
  disconnectFromWifi,
  getAvailableNetworks,
  getWifiStatus,
  refreshNetworks,
  rssiToPercent,
  type WifiNetwork,
  type WifiStatus,
} from "@/lib/wifi-client"

export function WifiConfig() {
  const [status, setStatus] = useState<WifiStatus | null>(null)
  const [networks, setNetworks] = useState<WifiNetwork[]>([])
  const [statusLoading, setStatusLoading] = useState(true)
  const [networksLoading, setNetworksLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [pendingNetwork, setPendingNetwork] = useState<WifiNetwork | null>(null)

  const isConnected = status?.status === "connected"
  const currentSsid = status?.ssid ?? ""

  async function loadStatus() {
    try {
      setStatusLoading(true)
      const s = await getWifiStatus()
      setStatus(s)
    } catch {
      setStatus({ status: "disconnected", ssid: "", ip: "", mac: "" })
    } finally {
      setStatusLoading(false)
    }
  }

  async function loadNetworks() {
    try {
      setNetworksLoading(true)
      const list = await getAvailableNetworks()
      // Sort strongest signal first.
      list.sort((a, b) => b.rssi - a.rssi)
      setNetworks(list)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load networks")
    } finally {
      setNetworksLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
    loadNetworks()
  }, [])

  async function handleScan() {
    setScanning(true)
    try {
      await refreshNetworks()
      // The ESP scans synchronously inside refresh — list should already be
      // current after the request returns.
      await loadNetworks()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Scan failed")
    } finally {
      setScanning(false)
    }
  }

  function handleNetworkSelect(ssid: string) {
    if (!ssid || ssid === currentSsid) return
    const network = networks.find((n) => n.ssid === ssid)
    if (!network) return

    // Always pop the dialog before connecting — even for open networks. The
    // dropdown change can fire from a stray click, and joining a network is
    // never a harmless action (the ESP drops its current connection mid-call).
    // The dialog hides the password field when the network is unsecured.
    setPendingNetwork(network)
    setPassword("")
    setPasswordDialogOpen(true)
  }

  async function doConnect(network: WifiNetwork, pass: string) {
    setConnecting(true)
    try {
      await connectToWifi({ ssid: network.ssid, pass })
      toast.success(`Connected to ${network.ssid}`)
      await loadStatus()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Connect failed")
    } finally {
      setConnecting(false)
    }
  }

  async function handleConnectFromDialog() {
    if (!pendingNetwork) return
    setPasswordDialogOpen(false)
    const target = pendingNetwork
    const pass = password
    setPendingNetwork(null)
    setPassword("")
    await doConnect(target, pass)
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      await disconnectFromWifi()
      toast.success("Disconnected")
      await loadStatus()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Disconnect failed")
    } finally {
      setDisconnecting(false)
    }
  }

  function getSignalIcon(percent: number) {
    if (percent > 70) return "text-primary"
    if (percent > 40) return "text-chart-3"
    return "text-destructive"
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isConnected ? (
              <Wifi className="h-5 w-5 text-primary" />
            ) : (
              <WifiOff className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <CardTitle>WiFi Network</CardTitle>
              <CardDescription>
                {statusLoading
                  ? "Checking connection..."
                  : isConnected
                  ? `Connected to ${currentSsid}`
                  : "Configure wireless network connection"}
              </CardDescription>
            </div>
          </div>
          {isConnected && (
            <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
              <Check className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="network">Available Networks</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleScan}
              disabled={scanning || networksLoading || connecting}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${scanning ? "animate-spin" : ""}`} />
              {scanning ? "Scanning..." : "Scan"}
            </Button>
          </div>
          <Select
            value={currentSsid || undefined}
            onValueChange={handleNetworkSelect}
            disabled={connecting || networks.length === 0}
          >
            <SelectTrigger id="network">
              <SelectValue
                placeholder={networksLoading ? "Loading networks..." : "Select a network"}
              />
            </SelectTrigger>
            <SelectContent>
              {networks.map((network) => {
                const percent = rssiToPercent(network.rssi)
                return (
                  <SelectItem key={network.ssid} value={network.ssid}>
                    <div className="flex items-center gap-2">
                      <Wifi className={`h-4 w-4 ${getSignalIcon(percent)}`} />
                      <span>{network.ssid}</span>
                      <span className="text-muted-foreground text-xs">({percent}%)</span>
                      {network.secured && <span className="text-xs text-muted-foreground">🔒</span>}
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">IP Address</Label>
            <p className="text-sm font-mono">
              {isConnected && status?.ip ? status.ip : "—"}
            </p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">MAC Address</Label>
            <p className="text-sm font-mono">
              {status?.mac || "—"}
            </p>
          </div>
        </div>

        <div className="pt-2">
          <Button
            variant="outline"
            onClick={handleDisconnect}
            disabled={!isConnected || disconnecting}
            className="w-full"
          >
            {disconnecting ? "Disconnecting..." : "Disconnect"}
          </Button>
        </div>
      </CardContent>

      {/* Connect Dialog — secured networks show a password field, open
          networks just confirm the join. */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect to {pendingNetwork?.ssid}</DialogTitle>
            <DialogDescription>
              {pendingNetwork?.secured
                ? "Enter the password to connect to this network."
                : "This is an open network — no password required. Continue?"}
            </DialogDescription>
          </DialogHeader>
          {pendingNetwork?.secured && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="dialog-password">Password</Label>
                <div className="relative">
                  <Input
                    id="dialog-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && password) {
                        void handleConnectFromDialog()
                      }
                    }}
                    placeholder="Enter network password"
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConnectFromDialog}
              disabled={connecting || (pendingNetwork?.secured === true && !password)}
            >
              {connecting ? "Connecting..." : "Connect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
