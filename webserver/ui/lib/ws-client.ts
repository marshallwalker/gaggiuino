// Module-level WebSocket singleton with auto-reconnect and pub/sub dispatch.
// Multiple components can subscribe and they all share one WS connection
// instead of each opening their own. Mirrors the `share: true` behavior of
// the legacy app's react-use-websocket without pulling that dependency.

import { getWsUrl, type WsEnvelope } from "@/lib/api";

type Listener = (msg: WsEnvelope<unknown>) => void;

const listeners = new Set<Listener>();
let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function connect() {
  if (typeof window === "undefined") return; // no-op during SSR / build
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  try {
    ws = new WebSocket(getWsUrl());
  } catch {
    scheduleReconnect();
    return;
  }

  ws.onmessage = (event) => {
    if (typeof event.data !== "string") return;
    try {
      const parsed = JSON.parse(event.data) as WsEnvelope<unknown>;
      listeners.forEach((listener) => listener(parsed));
    } catch {
      // Malformed frames just get dropped — the ESP shouldn't emit any.
    }
  };

  ws.onclose = () => {
    ws = null;
    scheduleReconnect();
  };

  ws.onerror = () => {
    // Let onclose handle reconnect — onerror always fires before onclose.
  };
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  // 1s linear retry — same as the legacy app's effective cadence under
  // react-use-websocket's defaults. Long-term: exponential backoff.
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (listeners.size > 0) connect();
  }, 1000);
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  connect();
  return () => {
    listeners.delete(listener);
    // Last subscriber gone — close the socket so dev HMR doesn't pile up
    // dangling connections on remount cycles.
    if (listeners.size === 0 && ws) {
      const localWs = ws;
      ws = null;
      try {
        localWs.close();
      } catch {
        // ignore
      }
    }
  };
}
