// Wire-format types + WS message constants for talking to the ESP webserver.
// Mirrors the legacy web-interface/src/models/api.ts.

export const MSG_SENSOR_DATA = "sensor_data_update";
export const MSG_SHOT_DATA = "shot_data_update";
export const MSG_PROFILE_NAMES = "profile_names_update";
export const MSG_LOG = "log_record";
export const MSG_SCALES_DATA = "scales_data_update";

export interface SensorData {
  brewActive: boolean;
  steamActive: boolean;
  scalesPresent: boolean;
  temperature: number;
  targetTemperature: number;
  pressure: number;
  targetPressure: number; // bar; 0 = no target (idle / non-pressure phase)
  pumpFlow: number;
  targetPumpFlow: number; // ml/s; 0 = no target
  weightFlow: number;
  weight: number;
  waterLvl: number;
  tofRangeRaw: number;
  tofRangeFull: number;
  tofRangeEmpty: number;
  activeProfile: number;
}

export interface ScalesData {
  present: boolean;
  raw1: number;
  raw2: number;
  weight: number;
  factor1: number;
  factor2: number;
}

export interface WsEnvelope<T> {
  action: string;
  data: T;
}

// Where the ESP lives. In production the static bundle is served from the ESP
// itself, so window.location.host is correct. In `next dev` (localhost:3000)
// neither HTTP /api nor /ws hits the ESP; rewrites() handles HTTP, but Next
// dev does not proxy WebSockets, so we connect directly to a hardcoded IP.
// Update this when the ESP moves networks (matches webserver/ui/next.config.mjs).
const DEV_ESP_HOST = "192.168.2.6";

export function getApiHost(): string {
  if (typeof window === "undefined") return "";
  if (process.env.NODE_ENV === "development") return DEV_ESP_HOST;
  return window.location.host;
}

export function getWsUrl(): string {
  return `ws://${getApiHost()}/ws`;
}

// In dev, REST fetches go through Next's rewrites() (relative /api). In prod,
// served from the ESP, relative /api also works. Same string either way.
export function getApiBase(): string {
  return "/api";
}
