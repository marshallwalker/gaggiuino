"use client";

import { useEffect, useState } from "react";
import { MSG_SHOT_DATA, type ShotData } from "@/lib/api";
import { subscribe } from "@/lib/ws-client";

/**
 * Subscribes to shot_data_update frames. The firmware only emits these
 * during an active brew (10 Hz), so the returned value:
 *   - stays at the last-seen frame after brew ends (acts as a "frozen" final
 *     reading for things like the shot timer)
 *   - is null before the first brew of the session
 *
 * Consumers that need a "freshness" signal should pair this with
 * sensor.brewActive from useSensorData.
 */
export function useShotData(): ShotData | null {
  const [data, setData] = useState<ShotData | null>(null);

  useEffect(() => {
    return subscribe((msg) => {
      if (msg.action === MSG_SHOT_DATA) {
        setData(msg.data);
      }
    });
  }, []);

  return data;
}
