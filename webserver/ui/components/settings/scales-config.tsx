"use client"

import { useState, useEffect } from "react"
import { Scale, RotateCcw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface LoadCellData {
  id: number
  name: string
  rawValue: number
  factor: number
  offset: number
  weight: number
}

export function ScalesConfig() {
  const [loadCells, setLoadCells] = useState<LoadCellData[]>([
    { id: 1, name: "Load Cell A", rawValue: 8421567, factor: 2148.5, offset: -23456, weight: 0 },
    { id: 2, name: "Load Cell B", rawValue: 8398234, factor: 2152.3, offset: -21890, weight: 0 },
  ])
  const [isTaring, setIsTaring] = useState(false)
  const [activeCell, setActiveCell] = useState<string>("cell-1")

  // Simulate live readings
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadCells((cells) =>
        cells.map((cell) => {
          const rawDelta = (Math.random() - 0.5) * 100
          const newRaw = cell.rawValue + rawDelta
          const weight = (newRaw + cell.offset) / cell.factor
          return { ...cell, rawValue: newRaw, weight }
        })
      )
    }, 100)
    return () => clearInterval(interval)
  }, [])

  const handleTare = () => {
    setIsTaring(true)
    setTimeout(() => {
      setLoadCells((cells) =>
        cells.map((cell) => ({
          ...cell,
          offset: -cell.rawValue,
          weight: 0,
        }))
      )
      setIsTaring(false)
    }, 1500)
  }

  const updateCellValue = (id: number, field: keyof LoadCellData, value: number) => {
    setLoadCells((cells) =>
      cells.map((cell) =>
        cell.id === id ? { ...cell, [field]: value } : cell
      )
    )
  }

  const combinedWeight = loadCells.reduce((sum, cell) => sum + cell.weight, 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Scale className="h-5 w-5 text-chart-3" />
            <div>
              <CardTitle>Scales Configuration</CardTitle>
              <CardDescription>HX711 dual load cell weight measurement system</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-muted-foreground">
            HX711
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Combined Weight Display */}
        <div className="p-4 rounded-lg bg-secondary/50 border border-border">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-muted-foreground">Combined Weight</Label>
            <div className="text-right">
              <span className="font-mono text-3xl font-semibold text-foreground">
                {combinedWeight.toFixed(1)}
              </span>
              <span className="text-lg text-muted-foreground ml-1">g</span>
            </div>
          </div>
        </div>

        {/* Load Cell Tabs */}
        <Tabs value={activeCell} onValueChange={setActiveCell}>
          <TabsList className="grid w-full grid-cols-2">
            {loadCells.map((cell) => (
              <TabsTrigger key={cell.id} value={`cell-${cell.id}`}>
                {cell.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {loadCells.map((cell) => (
            <TabsContent key={cell.id} value={`cell-${cell.id}`} className="space-y-4 mt-4">
              {/* Raw Value Display */}
              <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Raw ADC Value</Label>
                  <span className="font-mono text-lg text-foreground">
                    {Math.round(cell.rawValue).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <Label className="text-xs text-muted-foreground">Calculated Weight</Label>
                  <span className="font-mono text-lg text-primary">
                    {cell.weight.toFixed(2)} g
                  </span>
                </div>
              </div>

              {/* Calibration Values */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`factor-${cell.id}`}>Calibration Factor</Label>
                  <Input
                    id={`factor-${cell.id}`}
                    type="number"
                    step="0.1"
                    value={cell.factor}
                    onChange={(e) => updateCellValue(cell.id, "factor", Number(e.target.value))}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Raw units per gram
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`offset-${cell.id}`}>Offset Value</Label>
                  <Input
                    id={`offset-${cell.id}`}
                    type="number"
                    value={cell.offset}
                    onChange={(e) => updateCellValue(cell.id, "offset", Number(e.target.value))}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Zero point offset
                  </p>
                </div>
              </div>

              {/* Cell Stats */}
              <div className="grid grid-cols-3 gap-4 text-center p-3 rounded-lg bg-secondary/30">
                <div>
                  <Label className="text-xs text-muted-foreground">Capacity</Label>
                  <p className="text-sm font-mono">2000g</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Resolution</Label>
                  <p className="text-sm font-mono">0.01g</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Sample Rate</Label>
                  <p className="text-sm font-mono">80Hz</p>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleTare}
            disabled={isTaring}
            className="flex-1"
          >
            <RotateCcw className={`h-4 w-4 mr-2 ${isTaring ? "animate-spin" : ""}`} />
            {isTaring ? "Taring..." : "Tare Scale"}
          </Button>
          <Button className="flex-1">
            Save Calibration
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
