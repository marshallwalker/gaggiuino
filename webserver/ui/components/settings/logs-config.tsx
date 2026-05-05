"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Terminal, Trash2, Download, Pause, Play, Filter } from "lucide-react"

type LogLevel = "debug" | "info" | "warn" | "error"

interface LogEntry {
  id: number
  timestamp: Date
  level: LogLevel
  source: string
  message: string
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  debug: "text-muted-foreground",
  info: "text-blue-400",
  warn: "text-yellow-400",
  error: "text-red-400",
}

const LOG_LEVEL_BADGE: Record<LogLevel, string> = {
  debug: "bg-muted text-muted-foreground",
  info: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  warn: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  error: "bg-red-500/20 text-red-400 border-red-500/30",
}

// Mock log messages for simulation
const MOCK_MESSAGES: { level: LogLevel; source: string; message: string }[] = [
  { level: "debug", source: "TOF", message: "Reading water level: 847mm" },
  { level: "debug", source: "SCALE", message: "Load cell 1 raw: 8234521" },
  { level: "debug", source: "SCALE", message: "Load cell 2 raw: 8234890" },
  { level: "info", source: "WIFI", message: "Connected to HomeNetwork (192.168.1.42)" },
  { level: "info", source: "BOILER", message: "Temperature reached target: 93.0°C" },
  { level: "info", source: "BREW", message: "Shot started" },
  { level: "info", source: "BREW", message: "Preinfusion complete, extraction started" },
  { level: "info", source: "BREW", message: "Shot complete: 36.2g in 28.4s" },
  { level: "info", source: "PUMP", message: "Pressure stabilized at 9.0 bar" },
  { level: "warn", source: "WATER", message: "Water level low (15%)" },
  { level: "warn", source: "BOILER", message: "Temperature drift detected: +1.2°C" },
  { level: "warn", source: "SCALE", message: "Tare drift detected, recalibrating" },
  { level: "error", source: "PUMP", message: "Over-pressure protection triggered: 11.2 bar" },
  { level: "error", source: "BOILER", message: "Heating element timeout" },
  { level: "error", source: "WIFI", message: "Connection lost, reconnecting..." },
]

export function LogsConfig() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [logLevel, setLogLevel] = useState<LogLevel>("info")
  const [filterLevel, setFilterLevel] = useState<LogLevel>("debug")
  const [isPaused, setIsPaused] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const logIdRef = useRef(0)

  // Generate initial logs
  useEffect(() => {
    const initialLogs: LogEntry[] = []
    const now = new Date()
    for (let i = 20; i > 0; i--) {
      const entry = MOCK_MESSAGES[Math.floor(Math.random() * MOCK_MESSAGES.length)]
      initialLogs.push({
        id: logIdRef.current++,
        timestamp: new Date(now.getTime() - i * 2000),
        ...entry,
      })
    }
    setLogs(initialLogs)
  }, [])

  // Simulate incoming logs
  useEffect(() => {
    if (isPaused) return

    const interval = setInterval(() => {
      const entry = MOCK_MESSAGES[Math.floor(Math.random() * MOCK_MESSAGES.length)]
      // Only add logs at or above the configured log level
      if (LOG_LEVEL_PRIORITY[entry.level] >= LOG_LEVEL_PRIORITY[logLevel]) {
        setLogs((prev) => [
          ...prev.slice(-200), // Keep last 200 logs
          {
            id: logIdRef.current++,
            timestamp: new Date(),
            ...entry,
          },
        ])
      }
    }, 1500 + Math.random() * 2000)

    return () => clearInterval(interval)
  }, [isPaused, logLevel])

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  const filteredLogs = logs.filter(
    (log) => LOG_LEVEL_PRIORITY[log.level] >= LOG_LEVEL_PRIORITY[filterLevel]
  )

  const handleClearLogs = () => {
    setLogs([])
  }

  const handleDownloadLogs = () => {
    const logText = logs
      .map(
        (log) =>
          `[${log.timestamp.toISOString()}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}`
      )
      .join("\n")
    const blob = new Blob([logText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `espresso-logs-${new Date().toISOString().split("T")[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const logCounts = {
    debug: logs.filter((l) => l.level === "debug").length,
    info: logs.filter((l) => l.level === "info").length,
    warn: logs.filter((l) => l.level === "warn").length,
    error: logs.filter((l) => l.level === "error").length,
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary">
              <Terminal className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>System Logs</CardTitle>
              <CardDescription>View and manage machine logs</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={LOG_LEVEL_BADGE.error}>
              {logCounts.error}
            </Badge>
            <Badge variant="outline" className={LOG_LEVEL_BADGE.warn}>
              {logCounts.warn}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Log Level:</span>
            <Select value={logLevel} onValueChange={(v) => setLogLevel(v as LogLevel)}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="debug">Debug</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warn">Warn</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filter:</span>
            <Select value={filterLevel} onValueChange={(v) => setFilterLevel(v as LogLevel)}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="debug">Debug+</SelectItem>
                <SelectItem value="info">Info+</SelectItem>
                <SelectItem value="warn">Warn+</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPaused(!isPaused)}
            >
              {isPaused ? (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </>
              )}
            </Button>

            <Button variant="outline" size="sm" onClick={handleDownloadLogs}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all logs?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all {logs.length} log entries. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearLogs}>Clear Logs</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Log Viewer */}
        <div className="rounded-lg border border-border bg-background/50 overflow-hidden">
          <ScrollArea className="h-80" ref={scrollRef}>
            <div className="p-2 font-mono text-xs space-y-0.5">
              {filteredLogs.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No logs to display
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-2 py-1 px-2 rounded hover:bg-secondary/50"
                  >
                    <span className="text-muted-foreground shrink-0">
                      {formatTime(log.timestamp)}
                    </span>
                    <Badge
                      variant="outline"
                      className={`${LOG_LEVEL_BADGE[log.level]} text-[10px] px-1.5 py-0 shrink-0 uppercase`}
                    >
                      {log.level}
                    </Badge>
                    <span className="text-primary shrink-0">[{log.source}]</span>
                    <span className={LOG_LEVEL_COLORS[log.level]}>{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {filteredLogs.length} of {logs.length} entries
          </span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`flex items-center gap-1 ${autoScroll ? "text-primary" : ""}`}
            >
              <div className={`h-2 w-2 rounded-full ${autoScroll ? "bg-primary" : "bg-muted-foreground"}`} />
              Auto-scroll {autoScroll ? "on" : "off"}
            </button>
            {isPaused && (
              <span className="text-yellow-400">Paused</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
