// REST client for the ESP webserver's /api/wifi endpoints. Mirrors the legacy
// web-interface/src/components/client/WifiClient.ts.

import { getApiBase } from "@/lib/api";

export interface WifiStatus {
  status: "connected" | "disconnected";
  ssid: string;
  ip: string;
  mac: string; // STA MAC, populated whether or not we're currently connected
}

export interface WifiNetwork {
  ssid: string;
  rssi: number; // dBm, typically -30 (very strong) to -90 (very weak)
  secured: boolean;
}

export interface WifiCredentials {
  ssid: string;
  pass: string;
}

async function asJson<T>(res: Response, label: string): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${label} failed: ${res.status} ${text}`);
  }
  return (await res.json()) as T;
}

export async function getWifiStatus(): Promise<WifiStatus> {
  const res = await fetch(`${getApiBase()}/wifi/status`);
  return asJson<WifiStatus>(res, "GET /wifi/status");
}

export async function getAvailableNetworks(): Promise<WifiNetwork[]> {
  const res = await fetch(`${getApiBase()}/wifi/networks`);
  const networks = await asJson<WifiNetwork[]>(res, "GET /wifi/networks");
  // Drop empties and dedupe by SSID — mesh / repeater setups often advertise
  // the same SSID multiple times. Same filter the legacy client applies.
  const filtered = networks.filter((n) => n.ssid && n.ssid.length > 0);
  return Array.from(new Map(filtered.map((n) => [n.ssid, n])).values());
}

export async function refreshNetworks(): Promise<void> {
  const res = await fetch(`${getApiBase()}/wifi/networks`, { method: "DELETE" });
  if (!res.ok) {
    throw new Error(`DELETE /wifi/networks failed: ${res.status}`);
  }
}

export async function disconnectFromWifi(): Promise<void> {
  const res = await fetch(`${getApiBase()}/wifi/selected-network`, { method: "DELETE" });
  if (!res.ok) {
    throw new Error(`DELETE /wifi/selected-network failed: ${res.status}`);
  }
}

export async function connectToWifi(credentials: WifiCredentials): Promise<void> {
  // Server-side timeout is 9s (wifiConnect call). Give the client a little
  // headroom so we surface server errors instead of fetch timing out first.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(`${getApiBase()}/wifi/selected-network`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(body.message || `Connect failed: ${res.status}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

// RSSI (dBm, negative) to a 0-100 % bar. -50 dBm or stronger = 100%, -100 dBm
// or weaker = 0%, linear in between. Standard mapping; matches what most
// router admin pages show.
export function rssiToPercent(rssi: number): number {
  if (rssi >= -50) return 100;
  if (rssi <= -100) return 0;
  return Math.round(2 * (rssi + 100));
}
