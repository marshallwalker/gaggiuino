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
  long pumpClicks;
  uint16_t waterLvl;
  uint16_t tofRangeRaw;           // Raw VL53L0X distance in mm (for live calibration UX)
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
  float pumpFlow;
  float weightFlow;
  float weight;
  uint16_t waterLvl;
  uint16_t tofRangeRaw;           // Raw VL53L0X distance in mm (0 = no reading / sensor missing)
  uint8_t activeProfile;          // 1-indexed for UI consistency
};

#define PROFILE_NAMES_COUNT 5
#define PROFILE_NAMES_LENGTH 25
struct ProfileNamesSnapshot {
  char names[PROFILE_NAMES_COUNT][PROFILE_NAMES_LENGTH];
};

#endif
