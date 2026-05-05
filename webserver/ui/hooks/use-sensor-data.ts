"use client";

import { useEffect, useState } from "react";
import { MSG_SENSOR_DATA, type SensorData, type WsEnvelope } from "@/lib/api";
import { subscribe } from "@/lib/ws-client";

const DEFAULT_SENSOR_DATA: SensorData = {
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
  tofRangeRaw: 0,
  tofRangeFull: 0,
  tofRangeEmpty: 0,
  activeProfile: 1,
};

/**
 * Subscribes to sensor_data_update frames from the ESP webserver and returns
 * the latest snapshot. Falls back to zeros before the first frame arrives so
 * components don't have to null-check every field.
 */
export function useSensorData(): SensorData {
  const [data, setData] = useState<SensorData>(DEFAULT_SENSOR_DATA);

  useEffect(() => {
    return subscribe((msg: WsEnvelope<unknown>) => {
      if (msg.action === MSG_SENSOR_DATA) {
        setData(msg.data as SensorData);
      }
    });
  }, []);

  return data;
}
