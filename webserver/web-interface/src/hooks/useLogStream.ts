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

/**
 * Subscribes to the ESP webserver's log_record WebSocket frames and
 * accumulates them into a rolling buffer (most recent at the end). Older
 * lines past `maxLines` are dropped.
 *
 * The underlying socket is shared across all consumers via
 * react-use-websocket's `share: true`.
 */
export default function useLogStream(maxLines: number = DEFAULT_MAX_LINES): LogRecord[] {
  const [logLines, setLogLines] = useState<LogRecord[]>([]);

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
      setLogLines((prev) => {
        const next = prev.length >= maxLines ? prev.slice(prev.length - maxLines + 1) : [...prev];
        next.push(envelope.data);
        return next;
      });
    }
  }, [lastJsonMessage, maxLines]);

  return logLines;
}
