"use client";

import { useEffect, useState } from "react";
import { useSensorData } from "@/hooks/use-sensor-data";
import { getProfile, type ProfileData } from "@/lib/profiles-client";

export interface ActiveProfileState {
  data: ProfileData | null;
  loading: boolean;
  activeIndex: number;
}

/**
 * Tracks the active profile index from the sensor stream and refetches the
 * basic settings whenever it changes. The ESP caches per-index, so multiple
 * components calling this hook only pay one round-trip per index transition.
 *
 * Out-of-band switches (Nextion tap, another browser tab) drive the same
 * refetch since they update sensor.activeProfile too.
 */
export function useActiveProfile(): ActiveProfileState {
  const sensor = useSensorData();
  const activeIndex = sensor.activeProfile;
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeIndex || activeIndex < 1 || activeIndex > 5) return;
    let cancelled = false;
    setLoading(true);
    getProfile(activeIndex)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeIndex]);

  return { data, loading, activeIndex };
}
