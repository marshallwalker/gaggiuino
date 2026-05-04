export const MSG_TYPE_SHOT_DATA = 'shot_data_update';
export const MSG_TYPE_SENSOR_DATA = 'sensor_data_update';
export const MSG_TYPE_PROFILE_NAMES = 'profile_names_update';
export const MSG_TYPE_LOG = 'log_record';

export interface SensorData {
  brewActive: boolean;
  steamActive: boolean;
  scalesPresent: boolean;
  temperature: number;
  targetTemperature: number;
  pressure: number;
  pumpFlow: number;
  weightFlow: number;
  weight: number;
  waterLvl: number;
  activeProfile: number;
}

export interface ProfileSummary {
  index: number;
  name: string;
}

export interface ShotData {
  timeInShot: number;
  pressure: number;
  pumpFlow: number;
  weightFlow: number;
  temperature: number;
  shotWeight: number;
  waterPumped: number;
  targetTemperature: number;
  targetPumpFlow: number;
  targetPressure: number;
}

export interface LogRecord {
  source: string;
  log: string;
}

// Log level letters as emitted by the STM/ESP log() functions:
// "E (file:line): msg" -> 'E', etc.
export type LogLevel = 'E' | 'I' | 'V' | 'D';

export const LOG_LEVEL_LABELS: Record<LogLevel, string> = {
  E: 'Error',
  I: 'Info',
  V: 'Verbose',
  D: 'Debug',
};

// Numeric ordering for "show this level and above" filtering.
// Lower number = higher severity.
export const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  E: 1,
  I: 2,
  V: 3,
  D: 4,
};

export function getLogLevel(log: string): LogLevel {
  const first = log.charAt(0);
  if (first === 'E' || first === 'I' || first === 'V' || first === 'D') {
    return first;
  }
  // Unknown prefix - treat as Info so it always shows up at common filter
  // levels rather than getting hidden.
  return 'I';
}

export interface WsEnvelope<T> {
  action: string;
  data: T;
}

export type WsRawMessage = MessageEvent<string> | { data?: string } | null;
export type WsParsedMessage = WsEnvelope<unknown> | null;

export function filterSocketMessage(message: WsRawMessage, ...types: string[]): boolean {
  if (!message || !message.data) {
    return false;
  }
  return types.some((type) => message.data!.indexOf(type) >= 0);
}

export function filterJsonMessage(message: WsParsedMessage, ...types: string[]): boolean {
  if (!message || !message.action) {
    return false;
  }
  return types.some((type) => message.action === type);
}

export const defaultShotSnapshot: ShotData = {
  timeInShot: 0,
  pressure: 0,
  pumpFlow: 0,
  weightFlow: 0,
  temperature: 0,
  shotWeight: 0,
  waterPumped: 0,
  targetTemperature: 0,
  targetPumpFlow: 0,
  targetPressure: 0,
};

export const apiHost: string = import.meta.env.DEV
  ? '192.168.4.1'
  : window.location.host;

export function formatTimeInShot(timeInShot: number): string {
  const milliseconds = timeInShot % 1000;
  const seconds = Math.floor(timeInShot / 1000) % 60;
  const minutes = Math.floor(timeInShot / 60000);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}
