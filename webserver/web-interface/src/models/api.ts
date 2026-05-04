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
