// REST client for /api/profiles. Names list + per-profile basic settings +
// active-profile switch. The per-profile fetch hits the bounded-poll
// endpoint, which forwards to the STM and waits up to 300 ms for the
// response — first call after boot can take a moment, subsequent calls
// hit the ESP-side cache and are instant.

import { getApiBase } from "@/lib/api";

export interface ProfileSummary {
  index: number;  // 1-indexed
  name: string;
}

export interface ProfileData {
  index: number;
  name: string;
  preinfusionSec: number;
  preinfusionBar: number;
  setpoint: number;            // brew temp °C
  shotDose: number;            // input dose in grams
  shotStopOnCustomWeight: number;
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
