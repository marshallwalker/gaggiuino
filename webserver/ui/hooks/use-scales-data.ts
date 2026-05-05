"use client";

import { useEffect, useState } from "react";
import { MSG_SCALES_DATA, type ScalesData, type WsEnvelope } from "@/lib/api";
import { subscribe } from "@/lib/ws-client";

const DEFAULT_SCALES_DATA: ScalesData = {
  present: false,
  raw1: 0,
  raw2: 0,
  weight: 0,
  factor1: 1,
  factor2: 1,
};

/**
 * Subscribes to scales_data_update frames — separate from sensor_data_update
 * because the scales calibration UI needs per-cell raw values + factors that
 * the general sensor stream doesn't carry.
 */
export function useScalesData(): ScalesData {
  const [data, setData] = useState<ScalesData>(DEFAULT_SCALES_DATA);

  useEffect(() => {
    return subscribe((msg: WsEnvelope<unknown>) => {
      if (msg.action === MSG_SCALES_DATA) {
        setData(msg.data as ScalesData);
      }
    });
  }, []);

  return data;
}
