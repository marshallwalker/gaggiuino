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

const DEFAULT_MAX_LINES = 200;

// Module-level singleton so logs accumulate across LogContainer mount/unmount
// cycles (e.g., navigating Home -> Settings should still show the logs that
// streamed in while the user was on Home).
let buffer: LogRecord[] = [];
const subscribers = new Set<(snapshot: LogRecord[]) => void>();

function appendLog(line: LogRecord, maxLines: number) {
  const next = buffer.length >= maxLines
    ? buffer.slice(buffer.length - maxLines + 1)
    : [...buffer];
  next.push(line);
  buffer = next;
  subscribers.forEach((sub) => sub(buffer));
}

/**
 * Subscribes to the ESP webserver's log_record WebSocket frames and
 * accumulates them into a module-level rolling buffer (most recent at the
 * end). Older lines past `maxLines` are dropped.
 *
 * The buffer survives component unmount so navigating away from the
 * LogContainer and back in again doesn't lose past lines. The underlying
 * socket is shared across all consumers via react-use-websocket's
 * `share: true`.
 */
export default function useLogStream(maxLines: number = DEFAULT_MAX_LINES): LogRecord[] {
  const [snapshot, setSnapshot] = useState<LogRecord[]>(buffer);

  // Subscribe this component to buffer changes.
  useEffect(() => {
    const sub = (next: LogRecord[]) => setSnapshot(next);
    subscribers.add(sub);
    // Sync immediately in case logs arrived between render and effect.
    setSnapshot(buffer);
    return () => {
      subscribers.delete(sub);
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
