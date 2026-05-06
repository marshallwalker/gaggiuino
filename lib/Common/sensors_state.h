/* 09:32 15/03/2023 - change triggering comment */
#ifndef SENSORS_STATE_H
#define SENSORS_STATE_H

struct SensorState {
  bool brewSwitchState;
  bool steamSwitchState;
  bool hotWaterSwitchState;
  bool isSteamForgottenON;
  bool scalesPresent;
  bool tarePending;
  float temperature;          // °C
  /* calculated water temperature as wanted but not guaranteed
  due to boiler having a hard limit of 4ml/s heat capacity */
  float waterTemperature;     // °C
  float currentTargetTemp;    // °C - active setpoint (brew or steam, mode-dependent)
  float pressure;             // bar
  float pressureChangeSpeed;  // bar/s
  float pumpFlow;             // ml/s
  float pumpFlowChangeSpeed;  // ml/s^2
  float waterPumped;
  float weightFlow;
  float weight;
  float shotWeight;
  float smoothedPressure;
  float smoothedPumpFlow;
  float smoothedWeightFlow;
  float consideredFlow;
  // Live targets from the active brew phase. 0 means "no target" — i.e.
  // not currently brewing, or the active phase doesn't drive that variable.
  // For pressure phases, targetPressure is the setpoint; for flow phases
  // it's the configured restriction (pressure cap). Mirrors the
  // ShotSnapshot fields but available outside the shot stream.
  float targetPressure;       // bar
  float targetPumpFlow;       // ml/s
  long pumpClicks;
  uint16_t waterLvl;
  uint16_t tofRangeRaw;           // Raw VL53L0X distance in mm (for live calibration UX)
  uint16_t tofRangeFull;          // Persisted "tank full" reference in mm
  uint16_t tofRangeEmpty;         // Persisted "tank empty" reference in mm
  bool tofReady;
  uint8_t activeProfile;          // 1-indexed for UI consistency
};

struct SensorStateSnapshot {
  bool brewActive;
  bool steamActive;
  bool scalesPresent;
  float temperature;
  float targetTemperature;
  float pressure;
  float targetPressure;           // bar; 0 = no target (idle / non-pressure phase)
  float pumpFlow;
  float targetPumpFlow;           // ml/s; 0 = no target
  float weightFlow;
  float weight;
  uint16_t waterLvl;
  uint16_t tofRangeRaw;           // Raw VL53L0X distance in mm (0 = no reading / sensor missing)
  uint16_t tofRangeFull;          // Persisted "tank full" reference in mm
  uint16_t tofRangeEmpty;         // Persisted "tank empty" reference in mm
  uint8_t activeProfile;          // 1-indexed for UI consistency
  // FNV-1a hash over runningCfg.profiles[]. ESP compares against its cached
  // value each frame; mismatch invalidates the per-slot ProfileDataSnapshot
  // cache and kicks off a re-sync. Collisions are astronomically unlikely
  // for the kind of in-place edits the firmware makes (single-field flips,
  // numeric tweaks). Sentinel 0 = "not yet computed by STM".
  uint32_t profilesChecksum;
};

#define PROFILE_NAMES_COUNT 5
#define PROFILE_NAMES_LENGTH 25
struct ProfileNamesSnapshot {
  char names[PROFILE_NAMES_COUNT][PROFILE_NAMES_LENGTH];
};

#endif
