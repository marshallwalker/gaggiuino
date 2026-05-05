"use client";

import { useEffect, useState } from "react";
import { MSG_LOG, type LogRecord } from "@/lib/api";
import { subscribe } from "@/lib/ws-client";
import { getLogs } from "@/lib/logs-client";

// Each entry is the raw firmware log + the client-side timestamp captured
// when it arrived. Firmware doesn't emit timestamps in the wire format, so
// we tag them on receive — close enough for a live log viewer.
export interface TimedLog {
  record: LogRecord;
  receivedAt: Date;
}

interface UseLogsOptions {
  // Rolling buffer cap. Older entries get dropped past this. The ESP-side
  // history is also ~100, so 200 here gives a little headroom for new
  // entries arriving after history bootstrap.
  maxLines?: number;
}

/**
 * Bootstraps from /api/logs on mount, then appends MSG_LOG frames as they
 * arrive. Returns a rolling buffer of {record, receivedAt} entries with
 * `receivedAt` populated client-side (the firmware doesn't send timestamps).
 *
 * History entries from /api/logs all get the same load timestamp since we
 * can't reconstruct when each was actually emitted — known limitation, but
 * new entries are accurately timed.
 */
export function useLogs({ maxLines = 200 }: UseLogsOptions = {}): TimedLog[] {
  const [logs, setLogs] = useState<TimedLog[]>([]);

  useEffect(() => {
    let cancelled = false;
    getLogs()
      .then((records) => {
        if (cancelled) return;
        const now = new Date();
        const seeded: TimedLog[] = records.map((record) => ({
          record,
          // All history entries share the load timestamp since the wire
          // format doesn't carry a timestamp. Better than fabricating times.
          receivedAt: now,
        }));
        // Splice ahead of any live entries that may have already arrived
        // during the in-flight history fetch.
        setLogs((prev) => [...seeded, ...prev].slice(-maxLines));
      })
      .catch(() => {
        // History fetch failure is non-fatal — the live stream still works.
      });
    return () => {
      cancelled = true;
    };
  }, [maxLines]);

  useEffect(() => {
    return subscribe((msg) => {
      if (msg.action === MSG_LOG) {
        const entry: TimedLog = { record: msg.data, receivedAt: new Date() };
        setLogs((prev) => {
          const next = [...prev, entry];
          if (next.length > maxLines) next.splice(0, next.length - maxLines);
          return next;
        });
      }
    });
  }, [maxLines]);

  return logs;
}
