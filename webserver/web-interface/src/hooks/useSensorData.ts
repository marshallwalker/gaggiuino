import { useState, useEffect } from 'react';
import useWebSocket from 'react-use-websocket';
import {
  apiHost,
  filterJsonMessage,
  filterSocketMessage,
  MSG_TYPE_SENSOR_DATA,
  SensorData,
  WsEnvelope,
} from '../models/api';

export const DEFAULT_SENSOR_DATA: SensorData = {
  brewActive: false,
  steamActive: false,
  scalesPresent: false,
  temperature: 0,
  targetTemperature: 0,
  pressure: 0,
  pumpFlow: 0,
  weightFlow: 0,
  weight: 0,
  waterLvl: 0,
};

/**
 * Subscribes to the ESP webserver's sensor_data_update WebSocket frames
 * and returns the latest snapshot. Falls back to DEFAULT_SENSOR_DATA
 * before the first frame arrives. The underlying socket is shared
 * across all consumers via react-use-websocket's `share: true`.
 */
export default function useSensorData(): SensorData {
  const [data, setData] = useState<SensorData>(DEFAULT_SENSOR_DATA);

  const { lastJsonMessage } = useWebSocket(`ws://${apiHost}/ws`, {
    share: true,
    retryOnError: true,
    shouldReconnect: () => true,
    reconnectAttempts: 1000,
    filter: (message) => filterSocketMessage(message, MSG_TYPE_SENSOR_DATA),
  });

  useEffect(() => {
    const envelope = lastJsonMessage as WsEnvelope<SensorData> | null;
    if (envelope && filterJsonMessage(envelope, MSG_TYPE_SENSOR_DATA)) {
      setData(envelope.data);
    }
  }, [lastJsonMessage]);

  return data;
}
