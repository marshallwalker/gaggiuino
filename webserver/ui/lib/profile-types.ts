// Profile data model for Gaggiuino espresso machine
// 5 fixed slots stored in STM32 EEPROM

import type { ProfileData } from "@/lib/profiles-client"

export type ControlMode = "pressure" | "flow"
export type RampShape = "linear" | "ease-in" | "ease-out" | "s-curve"

export interface PreinfusionSettings {
  enabled: boolean
  mode: ControlMode
  // Pressure mode
  pressureDuration: number // seconds
  pressure: number // bar
  flowCap: number // ml/s
  // Flow mode
  flowRate: number // ml/s
  flowDuration: number // seconds
  pressureCap: number // bar
  // Common
  puckFillDetection: number // grams
  stopEarlyOnPressure: boolean
  stopEarlyAtWeight: number // grams
}

export interface SoakSettings {
  enabled: boolean
  soakTimePressure: number // seconds (pressure mode)
  soakTimeFlow: number // seconds (flow mode)
  maintainPressure: number // bar
  maintainFlow: number // ml/s
  stopBelowPressure: number // bar
  stopAbovePressure: number // bar
  stopAtWeight: number // grams
}

export interface RampSettings {
  duration: number // seconds
  shape: RampShape
}

export interface ProfilingPhase {
  enabled: boolean
  // Pressure control
  pressureStart: number // bar
  pressureEnd: number // bar
  pressureHoldDuration: number // seconds
  pressureHoldLimit: number
  pressureSlopeDuration: number // seconds
  pressureSlopeShape: RampShape
  flowRestriction: number // ml/s
  // Flow control
  flowStart: number // ml/s
  flowEnd: number // ml/s
  flowHoldDuration: number // seconds
  flowHoldLimit: number
  flowSlopeDuration: number // seconds
  flowSlopeShape: RampShape
  pressureRestriction: number // bar
}

export interface Profile {
  id: number // 0-4, slot index
  name: string // max 25 chars
  // Summary
  brewTemp: number // °C (90-96 typical)
  inputDose: number // grams (14-22 typical)
  stopOnWeight: boolean
  targetWeight: number // grams (when >= 1)
  presetMultiplier: number // 1=single, 2=double, 3=triple (used when targetWeight < 1)
  // Phases
  preinfusion: PreinfusionSettings
  soak: SoakSettings
  ramp: RampSettings
  transition: ProfilingPhase // Transition phase
  main: ProfilingPhase // Main extraction phase
}

// Default profile factory
export function createDefaultProfile(slotId: number, name: string): Profile {
  return {
    id: slotId,
    name,
    brewTemp: 93,
    inputDose: 18,
    stopOnWeight: true,
    targetWeight: 36,
    presetMultiplier: 2,
    preinfusion: {
      enabled: true,
      mode: "pressure",
      pressureDuration: 8,
      pressure: 2,
      flowCap: 4,
      flowRate: 2,
      flowDuration: 10,
      pressureCap: 3,
      puckFillDetection: 0.5,
      stopEarlyOnPressure: false,
      stopEarlyAtWeight: 0,
    },
    soak: {
      enabled: false,
      soakTimePressure: 5,
      soakTimeFlow: 5,
      maintainPressure: 2,
      maintainFlow: 1,
      stopBelowPressure: 0,
      stopAbovePressure: 0,
      stopAtWeight: 0,
    },
    ramp: {
      duration: 2,
      shape: "linear",
    },
    transition: {
      enabled: true,
      pressureStart: 6,
      pressureEnd: 9,
      pressureHoldDuration: 5,
      pressureHoldLimit: 0,
      pressureSlopeDuration: 3,
      pressureSlopeShape: "linear",
      flowRestriction: 0,
      flowStart: 2,
      flowEnd: 2.5,
      flowHoldDuration: 5,
      flowHoldLimit: 0,
      flowSlopeDuration: 3,
      flowSlopeShape: "linear",
      pressureRestriction: 9,
    },
    main: {
      enabled: true,
      pressureStart: 9,
      pressureEnd: 6,
      pressureHoldDuration: 0,
      pressureHoldLimit: 0,
      pressureSlopeDuration: 20,
      pressureSlopeShape: "linear",
      flowRestriction: 0,
      flowStart: 2.5,
      flowEnd: 2,
      flowHoldDuration: 0,
      flowHoldLimit: 0,
      flowSlopeDuration: 20,
      flowSlopeShape: "linear",
      pressureRestriction: 9,
    },
  }
}

// Generate initial 5 profiles
export function createDefaultProfiles(): Profile[] {
  return [
    { ...createDefaultProfile(0, "Londinium"), main: { ...createDefaultProfile(0, "").main, pressureStart: 9, pressureEnd: 6 } },
    { ...createDefaultProfile(1, "La Marzocco"), main: { ...createDefaultProfile(1, "").main, pressureStart: 9, pressureEnd: 9 } },
    { ...createDefaultProfile(2, "Slayer"), preinfusion: { ...createDefaultProfile(2, "").preinfusion, mode: "flow", flowRate: 2, flowDuration: 30 } },
    { ...createDefaultProfile(3, "Blooming"), soak: { ...createDefaultProfile(3, "").soak, enabled: true, soakTimePressure: 30 } },
    createDefaultProfile(4, "Custom"),
  ]
}

// TransitionCurve enum maps the firmware sends as uint16. The v0/UI uses
// readable strings; these tables convert in both directions. Anything we
// can't recognise round-trips as "linear" (firmware default).
const SHAPE_FROM_INT: Record<number, RampShape> = {
  0: "s-curve",  // EASE_IN_OUT
  1: "ease-in",  // EASE_IN
  2: "ease-out", // EASE_OUT
  3: "linear",   // LINEAR
  4: "linear",   // INSTANT — no UI representation; treat as linear
}
const SHAPE_TO_INT: Record<RampShape, number> = {
  "s-curve": 0,
  "ease-in": 1,
  "ease-out": 2,
  "linear": 3,
}

const shapeFromInt = (v: number | undefined): RampShape =>
  (v !== undefined && SHAPE_FROM_INT[v]) || "linear"
const shapeToInt = (s: RampShape): number => SHAPE_TO_INT[s] ?? 3

// Wire shape (mirrors the firmware ProfileDataSnapshot 1:1).
export type ApiProfileData = ProfileData

// Maps the firmware ProfileData onto the v0 Profile shape used by the editor.
// Field naming differs (UI uses friendlier names grouped by phase); this is
// the single conversion point so the editor doesn't need to know about the
// flat firmware struct.
export function profileFromApi(api: ApiProfileData, fallbackName?: string): Profile {
  const name = api.name || fallbackName || `Slot ${api.index}`
  return {
    id: api.index - 1,
    name,
    brewTemp: api.setpoint,
    inputDose: api.shotDose,
    stopOnWeight: api.stopOnWeightState,
    // shotStopOnCustomWeight is the absolute target; if zero, firmware falls
    // back to dose × shotPreset multiplier. UI shows the resolved number.
    targetWeight:
      api.shotStopOnCustomWeight > 0
        ? api.shotStopOnCustomWeight
        : api.shotDose * api.shotPreset,
    presetMultiplier: api.shotPreset || 2,
    preinfusion: {
      enabled: api.preinfusionState,
      mode: api.preinfusionFlowState ? "flow" : "pressure",
      pressureDuration: api.preinfusionSec,
      pressure: api.preinfusionBar,
      flowCap: api.preinfusionPressureFlowTarget,
      flowRate: api.preinfusionFlowVol,
      flowDuration: api.preinfusionFlowTime,
      pressureCap: api.preinfusionFlowPressureTarget,
      puckFillDetection: api.preinfusionFilled,
      stopEarlyOnPressure: api.preinfusionPressureAbove,
      stopEarlyAtWeight: api.preinfusionWeightAbove,
    },
    soak: {
      enabled: api.soakState,
      soakTimePressure: api.soakTimePressure,
      soakTimeFlow: api.soakTimeFlow,
      maintainPressure: api.soakKeepPressure,
      maintainFlow: api.soakKeepFlow,
      stopBelowPressure: api.soakBelowPressure,
      stopAbovePressure: api.soakAbovePressure,
      stopAtWeight: api.soakAboveWeight,
    },
    ramp: {
      duration: api.preinfusionRamp,
      shape: shapeFromInt(api.preinfusionRampSlope),
    },
    transition: {
      // tpType picks pressure (false) vs flow (true) for the transition phase.
      enabled: api.tpState,
      pressureStart: api.tpProfilingStart,
      pressureEnd: api.tpProfilingFinish,
      pressureHoldDuration: api.tpProfilingHold,
      pressureHoldLimit: api.tpProfilingHoldLimit,
      pressureSlopeDuration: api.tpProfilingSlope,
      pressureSlopeShape: shapeFromInt(api.tpProfilingSlopeShape),
      flowRestriction: api.tpProfilingFlowRestriction,
      flowStart: api.tfProfileStart,
      flowEnd: api.tfProfileEnd,
      flowHoldDuration: api.tfProfileHold,
      flowHoldLimit: api.tfProfileHoldLimit,
      flowSlopeDuration: api.tfProfileSlope,
      flowSlopeShape: shapeFromInt(api.tfProfileSlopeShape),
      pressureRestriction: api.tfProfilingPressureRestriction,
    },
    main: {
      enabled: api.profilingState,
      pressureStart: api.mpProfilingStart,
      pressureEnd: api.mpProfilingFinish,
      pressureHoldDuration: 0, // firmware doesn't store a main pressure hold
      pressureHoldLimit: 0,
      pressureSlopeDuration: api.mpProfilingSlope,
      pressureSlopeShape: shapeFromInt(api.mpProfilingSlopeShape),
      flowRestriction: api.mpProfilingFlowRestriction,
      flowStart: api.mfProfileStart,
      flowEnd: api.mfProfileEnd,
      flowHoldDuration: 0,
      flowHoldLimit: 0,
      flowSlopeDuration: api.mfProfileSlope,
      flowSlopeShape: shapeFromInt(api.mfProfileSlopeShape),
      pressureRestriction: api.mfProfilingPressureRestriction,
    },
  }
}

// Reverse mapping: v0 Profile → firmware ProfileData. Returned as a full
// snapshot (no Partial) so callers don't have to think about which fields
// to omit — the ESP-side merge is identity for unchanged values.
export function profileToApi(p: Profile): ApiProfileData {
  // Pick whichever main-flow control flag is appropriate. The firmware uses
  // mfProfileState to switch the main phase from pressure to flow control;
  // the v0 editor doesn't expose a single flag for this so we leave it
  // false (pressure) by default. Same for tpType in the transition phase.
  return {
    index: p.id + 1,
    name: p.name,
    // Preinfusion
    preinfusionState: p.preinfusion.enabled,
    preinfusionFlowState: p.preinfusion.mode === "flow",
    preinfusionSec: p.preinfusion.pressureDuration,
    preinfusionBar: p.preinfusion.pressure,
    preinfusionFlowVol: p.preinfusion.flowRate,
    preinfusionFlowTime: p.preinfusion.flowDuration,
    preinfusionFlowPressureTarget: p.preinfusion.pressureCap,
    preinfusionPressureFlowTarget: p.preinfusion.flowCap,
    preinfusionFilled: p.preinfusion.puckFillDetection,
    preinfusionPressureAbove: p.preinfusion.stopEarlyOnPressure,
    preinfusionWeightAbove: p.preinfusion.stopEarlyAtWeight,
    // Soak
    soakState: p.soak.enabled,
    soakTimePressure: p.soak.soakTimePressure,
    soakTimeFlow: p.soak.soakTimeFlow,
    soakKeepPressure: p.soak.maintainPressure,
    soakKeepFlow: p.soak.maintainFlow,
    soakBelowPressure: p.soak.stopBelowPressure,
    soakAbovePressure: p.soak.stopAbovePressure,
    soakAboveWeight: p.soak.stopAtWeight,
    // Ramp
    preinfusionRamp: p.ramp.duration,
    preinfusionRampSlope: shapeToInt(p.ramp.shape),
    // Transition (pressure)
    tpState: p.transition.enabled,
    tpType: false,
    tpProfilingStart: p.transition.pressureStart,
    tpProfilingFinish: p.transition.pressureEnd,
    tpProfilingHold: p.transition.pressureHoldDuration,
    tpProfilingHoldLimit: p.transition.pressureHoldLimit,
    tpProfilingSlope: p.transition.pressureSlopeDuration,
    tpProfilingSlopeShape: shapeToInt(p.transition.pressureSlopeShape),
    tpProfilingFlowRestriction: p.transition.flowRestriction,
    // Transition (flow)
    tfProfileStart: p.transition.flowStart,
    tfProfileEnd: p.transition.flowEnd,
    tfProfileHold: p.transition.flowHoldDuration,
    tfProfileHoldLimit: p.transition.flowHoldLimit,
    tfProfileSlope: p.transition.flowSlopeDuration,
    tfProfileSlopeShape: shapeToInt(p.transition.flowSlopeShape),
    tfProfilingPressureRestriction: p.transition.pressureRestriction,
    // Main
    profilingState: p.main.enabled,
    mfProfileState: false,
    mpProfilingStart: p.main.pressureStart,
    mpProfilingFinish: p.main.pressureEnd,
    mpProfilingSlope: p.main.pressureSlopeDuration,
    mpProfilingSlopeShape: shapeToInt(p.main.pressureSlopeShape),
    mpProfilingFlowRestriction: p.main.flowRestriction,
    mfProfileStart: p.main.flowStart,
    mfProfileEnd: p.main.flowEnd,
    mfProfileSlope: p.main.flowSlopeDuration,
    mfProfileSlopeShape: shapeToInt(p.main.flowSlopeShape),
    mfProfilingPressureRestriction: p.main.pressureRestriction,
    // Other
    setpoint: p.brewTemp,
    stopOnWeightState: p.stopOnWeight,
    shotDose: p.inputDose,
    // If the user picked a target weight, persist it as the absolute custom
    // value; otherwise leave it zero so the firmware uses dose × preset.
    shotStopOnCustomWeight: p.targetWeight > 0 ? p.targetWeight : 0,
    shotPreset: p.presetMultiplier,
  }
}

// Get profile summary for list view
export function getPreinfusionSummary(p: PreinfusionSettings): string {
  if (!p.enabled) return "Off"
  if (p.mode === "pressure") {
    return `${p.pressureDuration}s @ ${p.pressure} bar`
  }
  return `${p.flowDuration}s @ ${p.flowRate} ml/s`
}

export function getExtractionSummary(profile: Profile): string {
  if (!profile.main.enabled) {
    if (!profile.transition.enabled) return "Flat 9 bar"
    return `${profile.transition.pressureStart} bar`
  }
  const { pressureStart, pressureEnd, pressureSlopeDuration } = profile.main
  if (pressureStart === pressureEnd) {
    return `${pressureStart} bar flat`
  }
  return `${pressureStart}→${pressureEnd} bar / ${pressureSlopeDuration}s`
}
