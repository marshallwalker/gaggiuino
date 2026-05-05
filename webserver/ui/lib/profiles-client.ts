// REST client for /api/profiles. Names list + per-profile basic settings +
// active-profile switch. The per-profile fetch hits the bounded-poll
// endpoint, which forwards to the STM and waits up to 300 ms for the
// response — first call after boot can take a moment, subsequent calls
// hit the ESP-side cache and are instant.

import { getApiBase, type ProfileSummary } from "@/lib/api";

// Re-exported so existing imports from "@/lib/profiles-client" keep working
// without a sweep — ProfileSummary itself lives in api.ts now since it's
// also part of the WS message union.
export type { ProfileSummary };

export interface ProfileData {
  index: number;
  name: string;
  preinfusionSec: number;
  preinfusionBar: number;
  setpoint: number;       // brew temp °C
  shotDose: number;       // input dose in grams
  // Resolved target output weight (grams). STM applies the firmware's
  // custom-weight-vs-preset-multiplier fallback (shotStopOnCustomWeight if
  // set, else shotDose × shotPreset) so the UI just reads one number.
  // Only meaningful when stopOnWeightState is true.
  targetWeight: number;
  stopOnWeightState: boolean;
}

async function asJson<T>(res: Response, label: string): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${label} failed: ${res.status} ${text}`);
  }
  return (await res.json()) as T;
}

export async function getProfileNames(): Promise<ProfileSummary[]> {
  const res = await fetch(`${getApiBase()}/profiles`);
  return asJson<ProfileSummary[]>(res, "GET /profiles");
}

export async function getProfile(index: number): Promise<ProfileData> {
  const res = await fetch(`${getApiBase()}/profiles/${index}`);
  return asJson<ProfileData>(res, `GET /profiles/${index}`);
}

export async function setActiveProfile(index: number): Promise<void> {
  const res = await fetch(`${getApiBase()}/profiles/active`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ index }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PUT /profiles/active failed: ${res.status} ${text}`);
  }
}
