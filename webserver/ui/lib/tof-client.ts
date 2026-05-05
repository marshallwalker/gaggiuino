// REST client for the ToF water-tank calibration endpoints. Each call
// snapshots the current raw mm reading on the STM and persists it as either
// the "full" or "empty" reference. The STM enforces empty > full and rejects
// inversions, so a 422 here means the user captured the points in the wrong
// order (e.g. captured EMPTY while the tank was actually full).

import { getApiBase } from "@/lib/api";

async function postCapture(target: "full" | "empty"): Promise<void> {
  const res = await fetch(`${getApiBase()}/tof/calibrate/${target}`, { method: "POST" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`POST /tof/calibrate/${target} failed: ${res.status} ${text}`);
  }
}

export function calibrateTofFull(): Promise<void> {
  return postCapture("full");
}

export function calibrateTofEmpty(): Promise<void> {
  return postCapture("empty");
}
