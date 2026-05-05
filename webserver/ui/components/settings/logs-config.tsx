"use client"

import { useEffect, useMemo, useRef, useState } from "react"
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
import { Terminal, Trash2, ClipboardCopy, Check, Filter } from "lucide-react"
import { toast } from "sonner"
import { useLogs, type TimedLog } from "@/hooks/use-logs"
import {
  LOG_LEVEL_LABEL,
  LOG_LEVEL_ORDER,
  parseLog,
  type LogLevel,
} from "@/lib/logs-client"

// Tailwind classes for each level. Errors deserve color; info / debug stay
// muted so they don't dominate the viewer visually.
const LEVEL_TEXT: Record<LogLevel, string> = {
  E: "text-red-400",
  I: "text-blue-400",
  V: "text-muted-foreground",
  D: "text-muted-foreground/60",
}

const LEVEL_BADGE: Record<LogLevel, string> = {
  E: "bg-red-500/20 text-red-400 border-red-500/30",
  I: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  V: "bg-muted text-muted-foreground border-border",
  D: "bg-muted/50 text-muted-foreground/70 border-border",
}

function formatHHMMSS(date: Date): string {
  const h = date.getHours().toString().padStart(2, "0")
  const m = date.getMinutes().toString().padStart(2, "0")
  const s = date.getSeconds().toString().padStart(2, "0")
  return `${h}:${m}:${s}`
}

// Render one log line as the user-requested format:
// HH:MM:SS [LEVEL] [BOARD] [SYSTEM] message
function formatForClipboard(entry: TimedLog): string {
  const parsed = parseLog(entry.record.log)
  const level = LOG_LEVEL_LABEL[parsed.level]
  const time = formatHHMMSS(entry.receivedAt)
  const system = parsed.system || "?"
  return `${time} [${level}] [${entry.record.source}] [${system}] ${parsed.message}`
}

export function LogsConfig() {
  const liveLogs = useLogs({ maxLines: 500 })
  // Local clear: snapshot the count at clear time so we only display entries
  // that arrive AFTER. Resets on next clear.
  const [clearedAfter, setClearedAfter] = useState<number | null>(null)
  const [filterLevel, setFilterLevel] = useState<LogLevel>("V")
  const [autoScroll, setAutoScroll] = useState(true)
  const [copied, setCopied] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Effective viewport: drop everything up to clearedAfter (when set), then
  // apply the level filter. useMemo so the rendered list recomputes only
  // when inputs change.
  const visible = useMemo(() => {
    const base = clearedAfter !== null ? liveLogs.slice(clearedAfter) : liveLogs
    return base
      .map((entry) => ({ entry, parsed: parseLog(entry.record.log) }))
      .filter(({ parsed }) => LOG_LEVEL_ORDER[parsed.level] <= LOG_LEVEL_ORDER[filterLevel])
  }, [liveLogs, clearedAfter, filterLevel])

  // Auto-scroll on new content. Disabled if the user toggled it off.
  useEffect(() => {
    if (!autoScroll) return
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [visible, autoScroll])

  // Counts shown in the header — count from the live (post-clear) buffer
  // so the user gets feedback even when filtered down to one level.
  const counts = useMemo(() => {
    const base = clearedAfter !== null ? liveLogs.slice(clearedAfter) : liveLogs
    const c = { E: 0, I: 0, V: 0, D: 0 }
    for (const entry of base) {
      const lvl = parseLog(entry.record.log).level
      c[lvl] += 1
    }
    return c
  }, [liveLogs, clearedAfter])

  const handleClear = () => {
    setClearedAfter(liveLogs.length)
  }

  const handleCopy = async () => {
    if (visible.length === 0) {
      toast.error("No log lines to copy")
      return
    }
    const text = visible.map(({ entry }) => formatForClipboard(entry)).join("\n")
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success(`Copied ${visible.length} line${visible.length === 1 ? "" : "s"}`)
      setTimeout(() => setCopied(false), 1500)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Clipboard write failed")
    }
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
              <CardDescription>Live log stream from the STM and ESP</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={LEVEL_BADGE.E}>
              {counts.E}
            </Badge>
            <Badge variant="outline" className={LEVEL_BADGE.I}>
              {counts.I}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filter:</span>
            <Select value={filterLevel} onValueChange={(v) => setFilterLevel(v as LogLevel)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="E">Errors only</SelectItem>
                <SelectItem value="I">Info+</SelectItem>
                <SelectItem value="V">Verbose+</SelectItem>
                <SelectItem value="D">Debug+ (all)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? (
                <Check className="h-4 w-4 mr-1 text-primary" />
              ) : (
                <ClipboardCopy className="h-4 w-4 mr-1" />
              )}
              Copy
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
                  <AlertDialogTitle>Clear log view?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Hides the {visible.length} currently-displayed lines. New
                    entries will continue streaming in. The firmware-side
                    history is unchanged — refreshing the page brings it back.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClear}>Clear</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Log Viewer */}
        <div className="rounded-lg border border-border bg-background/50 overflow-hidden">
          <ScrollArea className="h-80" ref={scrollRef}>
            <div className="p-2 font-mono text-xs space-y-0.5">
              {visible.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  {liveLogs.length === 0
                    ? "Waiting for logs…"
                    : "No logs match the current filter"}
                </div>
              ) : (
                visible.map(({ entry, parsed }, idx) => (
                  <div
                    key={`${entry.receivedAt.getTime()}-${idx}`}
                    className="flex items-start gap-2 py-1 px-2 rounded hover:bg-secondary/50"
                  >
                    <span className="text-muted-foreground shrink-0">
                      {formatHHMMSS(entry.receivedAt)}
                    </span>
                    <Badge
                      variant="outline"
                      className={`${LEVEL_BADGE[parsed.level]} text-[10px] px-1.5 py-0 shrink-0 uppercase`}
                    >
                      {LOG_LEVEL_LABEL[parsed.level]}
                    </Badge>
                    <span className="text-primary shrink-0">[{entry.record.source}]</span>
                    {parsed.system && (
                      <span className="text-muted-foreground/70 shrink-0">[{parsed.system}]</span>
                    )}
                    <span className={LEVEL_TEXT[parsed.level]}>{parsed.message}</span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {visible.length} of{" "}
            {clearedAfter !== null ? liveLogs.length - clearedAfter : liveLogs.length} entries
          </span>
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`flex items-center gap-1 ${autoScroll ? "text-primary" : ""}`}
          >
            <div className={`h-2 w-2 rounded-full ${autoScroll ? "bg-primary" : "bg-muted-foreground"}`} />
            Auto-scroll {autoScroll ? "on" : "off"}
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
