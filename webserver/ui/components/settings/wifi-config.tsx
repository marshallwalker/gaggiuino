"use client"

import { useState } from "react"
import { Wifi, WifiOff, Eye, EyeOff, RefreshCw, Check } from "lucide-react"
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

interface Network {
  ssid: string
  signal: number
  secured: boolean
}

const mockNetworks: Network[] = [
  { ssid: "CoffeeShop_5G", signal: 95, secured: true },
  { ssid: "Home_Network", signal: 78, secured: true },
  { ssid: "Guest_WiFi", signal: 65, secured: false },
  { ssid: "Neighbor_2.4G", signal: 42, secured: true },
]

export function WifiConfig() {
  const [selectedNetwork, setSelectedNetwork] = useState<string>("CoffeeShop_5G")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isConnected, setIsConnected] = useState(true)
  const [isScanning, setIsScanning] = useState(false)
  const [networks, setNetworks] = useState<Network[]>(mockNetworks)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [pendingNetwork, setPendingNetwork] = useState<string | null>(null)

  const handleScan = () => {
    setIsScanning(true)
    setTimeout(() => {
      setIsScanning(false)
      setNetworks([...mockNetworks])
    }, 2000)
  }

  const handleNetworkSelect = (ssid: string) => {
    const network = networks.find(n => n.ssid === ssid)
    if (network?.secured && ssid !== selectedNetwork) {
      setPendingNetwork(ssid)
      setPassword("")
      setPasswordDialogOpen(true)
    } else {
      setSelectedNetwork(ssid)
      setIsConnected(true)
    }
  }

  const handleConnect = () => {
    if (pendingNetwork) {
      setSelectedNetwork(pendingNetwork)
      setPendingNetwork(null)
    }
    setPasswordDialogOpen(false)
    setIsConnected(true)
    setPassword("")
  }

  const handleDisconnect = () => {
    setIsConnected(false)
  }

  const getSignalIcon = (signal: number) => {
    if (signal > 70) return "text-primary"
    if (signal > 40) return "text-chart-3"
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
              <CardDescription>Configure wireless network connection</CardDescription>
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
              disabled={isScanning}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isScanning ? "animate-spin" : ""}`} />
              {isScanning ? "Scanning..." : "Scan"}
            </Button>
          </div>
          <Select value={selectedNetwork} onValueChange={handleNetworkSelect}>
            <SelectTrigger id="network">
              <SelectValue placeholder="Select a network" />
            </SelectTrigger>
            <SelectContent>
              {networks.map((network) => (
                <SelectItem key={network.ssid} value={network.ssid}>
                  <div className="flex items-center gap-2">
                    <Wifi className={`h-4 w-4 ${getSignalIcon(network.signal)}`} />
                    <span>{network.ssid}</span>
                    <span className="text-muted-foreground text-xs">({network.signal}%)</span>
                    {network.secured && (
                      <span className="text-xs text-muted-foreground">🔒</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">IP Address</Label>
            <p className="text-sm font-mono">192.168.1.105</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">MAC Address</Label>
            <p className="text-sm font-mono">A4:CF:12:8E:3B:7D</p>
          </div>
        </div>

        <div className="pt-2">
          <Button 
            variant="outline" 
            onClick={handleDisconnect}
            disabled={!isConnected}
            className="w-full"
          >
            Disconnect
          </Button>
        </div>
      </CardContent>

      {/* Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect to {pendingNetwork}</DialogTitle>
            <DialogDescription>
              Enter the password to connect to this network.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dialog-password">Password</Label>
              <div className="relative">
                <Input
                  id="dialog-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConnect} disabled={!password}>
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
