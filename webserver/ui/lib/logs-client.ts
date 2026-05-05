// REST + parsing helpers for the log stream. The ESP keeps the last ~100
// entries in a deque (websocket.cpp wsGetLogHistory) and serves them via
// /api/logs; new entries arrive on the live WS as MSG_LOG frames.

import { getApiBase, type LogRecord } from "@/lib/api";

export async function getLogs(): Promise<LogRecord[]> {
  const res = await fetch(`${getApiBase()}/logs`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GET /logs failed: ${res.status} ${text}`);
  }
  return (await res.json()) as LogRecord[];
}

// Firmware emits each log line as:
//
//     "I (file.cpp:42): actual message"
//
// where the leading char is the level prefix (E=Error, I=Info, V=Verbose,
// D=Debug — matching the LOG_LEVEL define). The (file:line) section is
// what we surface as SYSTEM in the UI; the rest is the message body.
export type LogLevel = "E" | "I" | "V" | "D";

export const LOG_LEVEL_LABEL: Record<LogLevel, string> = {
  E: "ERROR",
  I: "INFO",
  V: "VERBOSE",
  D: "DEBUG",
};

// Lower number = higher severity. Filter "show this and above" uses
// `LOG_LEVEL_ORDER[entry.level] <= LOG_LEVEL_ORDER[filter]`.
export const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  E: 1,
  I: 2,
  V: 3,
  D: 4,
};

export interface ParsedLog {
  level: LogLevel;
  system: string; // "file.cpp:42" — empty string if unparseable
  message: string;
}

const LOG_LINE_RE = /^([EIVD])\s+\(([^)]+)\):\s*(.*)$/;

export function parseLog(line: string): ParsedLog {
  const m = LOG_LINE_RE.exec(line);
  if (m) {
    return {
      level: m[1] as LogLevel,
      system: m[2],
      message: m[3],
    };
  }
  // Malformed / unknown shape: best-effort fall back so the line still
  // shows up in the viewer. Default to Info so common filter levels
  // include it instead of hiding it.
  const c = line.charAt(0);
  const level: LogLevel = c === "E" || c === "I" || c === "V" || c === "D" ? c : "I";
  return { level, system: "", message: line };
}
