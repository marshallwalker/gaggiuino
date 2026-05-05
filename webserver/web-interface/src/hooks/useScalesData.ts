import { useEffect, useState } from 'react';
import useWebSocket from 'react-use-websocket';
import {
  apiHost, filterJsonMessage, filterSocketMessage, MSG_TYPE_SCALES_DATA, WsEnvelope,
} from '@/models/api';
import type { ScalesState } from '@/components/client/ScalesClient';

export const DEFAULT_SCALES_STATE: ScalesState = {
  present: false,
  raw1: 0,
  raw2: 0,
  weight: 0,
  factor1: 1,
  factor2: 1,
};

export default function useScalesData(): ScalesState {
  const [data, setData] = useState<ScalesState>(DEFAULT_SCALES_STATE);

  const { lastJsonMessage } = useWebSocket(`ws://${apiHost}/ws`, {
    share: true,
    retryOnError: true,
    shouldReconnect: () => true,
    reconnectAttempts: 1000,
    filter: (message) => filterSocketMessage(message, MSG_TYPE_SCALES_DATA),
  });

  useEffect(() => {
    const envelope = lastJsonMessage as WsEnvelope<ScalesState> | null;
    if (envelope && filterJsonMessage(envelope, MSG_TYPE_SCALES_DATA)) {
      setData(envelope.data);
    }
  }, [lastJsonMessage]);

  return data;
}
