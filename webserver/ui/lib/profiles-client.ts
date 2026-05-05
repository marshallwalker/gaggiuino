// REST client for /api/profiles. Names list + per-profile full snapshot +
// active-profile switch + per-profile write. The per-profile fetch hits the
// bounded-poll endpoint, which forwards to the STM and waits up to ~300 ms
// for the response — first call after boot can take a moment, subsequent
// calls hit the ESP-side cache and are instant. PUT waits up to ~800 ms for
// the STM's write-confirmation re-push.

import { getApiBase, type ProfileSummary } from "@/lib/api";

// Re-exported so existing imports from "@/lib/profiles-client" keep working
// without a sweep — ProfileSummary itself lives in api.ts now since it's
// also part of the WS message union.
export type { ProfileSummary };

// Full ProfileDataSnapshot from the firmware, mirrored. ~50 fields covering
// every editable EEPROM-persisted setting on a profile slot. Field names
// match the wire JSON exactly (which mirrors the C++ struct names).
export interface ProfileData {
  index: number;
  name: string;
  // Preinfusion
  preinfusionState: boolean;
  preinfusionFlowState: boolean;
  preinfusionSec: number;
  preinfusionBar: number;
  preinfusionFlowVol: number;
  preinfusionFlowTime: number;
  preinfusionFlowPressureTarget: number;
  preinfusionPressureFlowTarget: number;
  preinfusionFilled: number;
  preinfusionPressureAbove: boolean;
  preinfusionWeightAbove: number;
  // Soak
  soakState: boolean;
  soakTimePressure: number;
  soakTimeFlow: number;
  soakKeepPressure: number;
  soakKeepFlow: number;
  soakBelowPressure: number;
  soakAbovePressure: number;
  soakAboveWeight: number;
  // Ramp
  preinfusionRamp: number;
  preinfusionRampSlope: number; // TransitionCurve enum: 0=EASE_IN_OUT 1=EASE_IN 2=EASE_OUT 3=LINEAR 4=INSTANT
  // Profiling - transition (pressure)
  tpState: boolean;
  tpType: boolean;
  tpProfilingStart: number;
  tpProfilingFinish: number;
  tpProfilingHold: number;
  tpProfilingHoldLimit: number;
  tpProfilingSlope: number;
  tpProfilingSlopeShape: number;
  tpProfilingFlowRestriction: number;
  // Profiling - transition (flow)
  tfProfileStart: number;
  tfProfileEnd: number;
  tfProfileHold: number;
  tfProfileHoldLimit: number;
  tfProfileSlope: number;
  tfProfileSlopeShape: number;
  tfProfilingPressureRestriction: number;
  // Profiling - main
  profilingState: boolean;
  mfProfileState: boolean;
  mpProfilingStart: number;
  mpProfilingFinish: number;
  mpProfilingSlope: number;
  mpProfilingSlopeShape: number;
  mpProfilingFlowRestriction: number;
  mfProfileStart: number;
  mfProfileEnd: number;
  mfProfileSlope: number;
  mfProfileSlopeShape: number;
  mfProfilingPressureRestriction: number;
  // Other
  setpoint: number;
  stopOnWeightState: boolean;
  shotDose: number;
  shotStopOnCustomWeight: number;
  shotPreset: number;
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

// PUT /api/profiles/{index}. Body can be a partial — missing fields fall back
// to the cached snapshot on the ESP side. The response echoes the actually-
// persisted snapshot (post any STM-side clamping), so callers should treat
// the returned value as canonical.
export async function setProfile(
  index: number,
  patch: Partial<ProfileData>,
): Promise<ProfileData> {
  const res = await fetch(`${getApiBase()}/profiles/${index}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return asJson<ProfileData>(res, `PUT /profiles/${index}`);
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
