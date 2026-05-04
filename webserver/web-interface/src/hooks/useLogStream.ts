import { useEffect, useState } from 'react';
import useWebSocket from 'react-use-websocket';
import {
  apiHost,
  filterJsonMessage,
  filterSocketMessage,
  LogRecord,
  MSG_TYPE_LOG,
  WsEnvelope,
} from '../models/api';
import { getLogs } from '../components/client/LogsClient';

const DEFAULT_MAX_LINES = 200;

// Module-level singleton so logs accumulate across LogContainer mount/unmount
// cycles (e.g., navigating Home -> Settings should still show the logs that
// streamed in while the user was on Home).
let buffer: LogRecord[] = [];
const subscribers = new Set<(snapshot: LogRecord[]) => void>();
// Track whether we've already seeded the buffer from /api/logs this session
// so we don't refetch on every component mount.
let historyFetched = false;

function notify() {
  subscribers.forEach((sub) => sub(buffer));
}

function appendLog(line: LogRecord, maxLines: number) {
  const next = buffer.length >= maxLines
    ? buffer.slice(buffer.length - maxLines + 1)
    : [...buffer];
  next.push(line);
  buffer = next;
  notify();
}

function seedHistory(history: LogRecord[]) {
  // Replace the buffer with the server's history snapshot. Any WS messages
  // delivered before this fetch landed are discarded - the server's history
  // is the authoritative recent past, and the WS will continue to deliver
  // anything new from this point forward.
  buffer = [...history];
  notify();
}

/**
 * Subscribes to the ESP webserver's log_record WebSocket frames and
 * accumulates them into a module-level rolling buffer (most recent at the
 * end). Older lines past `maxLines` are dropped.
 *
 * On first mount per JS context (i.e. once per page load) also fetches
 * /api/logs to seed the buffer with whatever the server has cached. This
 * makes the LogContainer survive a browser refresh - the React-side
 * module state gets wiped on reload but the ESP keeps its rolling history.
 *
 * The WebSocket subscription continues to deliver new log lines for the
 * lifetime of the page - the HTTP fetch only seeds the historical
 * portion.
 */
export default function useLogStream(maxLines: number = DEFAULT_MAX_LINES): LogRecord[] {
  const [snapshot, setSnapshot] = useState<LogRecord[]>(buffer);

  // Subscribe this component to buffer changes.
  useEffect(() => {
    const sub = (next: LogRecord[]) => setSnapshot(next);
    subscribers.add(sub);
    setSnapshot(buffer);
    return () => {
      subscribers.delete(sub);
    };
  }, []);

  // One-shot history fetch per page load.
  useEffect(() => {
    if (historyFetched) return;
    historyFetched = true;
    let cancelled = false;
    getLogs()
      .then((history) => {
        if (cancelled) return;
        seedHistory(history);
      })
      .catch(() => {
        // Allow a future call to retry if /api/logs was unavailable
        // (e.g., ESP just rebooted and the endpoint isn't ready yet).
        historyFetched = false;
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { lastJsonMessage } = useWebSocket(`ws://${apiHost}/ws`, {
    share: true,
    retryOnError: true,
    shouldReconnect: () => true,
    reconnectAttempts: 1000,
    filter: (message) => filterSocketMessage(message, MSG_TYPE_LOG),
  });

  useEffect(() => {
    const envelope = lastJsonMessage as WsEnvelope<LogRecord> | null;
    if (envelope && filterJsonMessage(envelope, MSG_TYPE_LOG)) {
      appendLog(envelope.data, maxLines);
    }
  }, [lastJsonMessage, maxLines]);

  return snapshot;
}
