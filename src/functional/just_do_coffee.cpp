/* 09:32 15/03/2023 - change triggering comment */
#include "just_do_coffee.h"
#include "../lcd/lcd.h"

extern unsigned long steamTime;
// inline static float TEMP_DELTA(float d) { return (d*DELTA_RANGE); }
inline static float TEMP_DELTA(float d, const SensorState &currentState) {
  return (
    d * (currentState.pumpFlow < 1.f
      ? currentState.pumpFlow / 7.f
      : currentState.pumpFlow / 5.f
    )
  );
}

void justDoCoffee(const eepromValues_t &runningCfg, const SensorState &currentState, const bool brewActive) {
  lcdTargetState((int)HEATING::MODE_brew); // setting the target mode to "brew temp"
  float brewTempSetPoint = ACTIVE_PROFILE(runningCfg).setpoint + runningCfg.offsetTemp;
  float sensorTemperature = currentState.temperature + runningCfg.offsetTemp;

  if (brewActive) { //if brewState == true
    if(sensorTemperature <= brewTempSetPoint - 5.f) {
      setBoilerOn();
    } else {
      float deltaOffset = 0.f;
      if (runningCfg.brewDeltaState) {
        float tempDelta = TEMP_DELTA(brewTempSetPoint, currentState);
        float BREW_TEMP_DELTA = mapRange(sensorTemperature, brewTempSetPoint, brewTempSetPoint + tempDelta, tempDelta, 0, 0);
        deltaOffset = constrain(BREW_TEMP_DELTA, 0, tempDelta);
      }
      if (sensorTemperature <= brewTempSetPoint + deltaOffset) {
        pulseHeaters(runningCfg.hpwr, runningCfg.mainDivider, runningCfg.brewDivider, brewActive);
      } else {
        setBoilerOff();
      }
    }
  } else { //if brewState == false
    if (sensorTemperature <= ((float)brewTempSetPoint - 10.f)) {
      setBoilerOn();
    } else {
      int HPWR_LOW = runningCfg.hpwr / runningCfg.mainDivider;
      // Calculating the boiler heating power range based on the below input values
      int HPWR_OUT = mapRange(sensorTemperature, brewTempSetPoint - 10, brewTempSetPoint, runningCfg.hpwr, HPWR_LOW, 0);
      HPWR_OUT = constrain(HPWR_OUT, HPWR_LOW, runningCfg.hpwr);  // limits range of sensor values to HPWR_LOW and HPWR

      if (sensorTemperature <= ((float)brewTempSetPoint - 5.f)) {
        pulseHeaters(HPWR_OUT, 1, runningCfg.mainDivider, brewActive);
      } else if (sensorTemperature < ((float)brewTempSetPoint)) {
        pulseHeaters(HPWR_OUT,  runningCfg.brewDivider, runningCfg.brewDivider, brewActive);
      } else {
        setBoilerOff();
      }
    }
  }
  if (brewActive || !currentState.brewSwitchState) { // keep steam boiler supply valve open while steaming/descale only
    setSteamValveRelayOff();
  }
  setSteamBoilerRelayOff();
}

void pulseHeaters(const uint32_t pulseLength, const int factor_1, const int factor_2, const bool brewActive) {
  // Static state across calls: heaterWave is when the current ON/OFF segment
  // started, heaterState toggles on each segment boundary.
  static uint32_t heaterWave = 0;
  static bool heaterState = false;
  static uint32_t lastInvocation = 0;

  uint32_t now = millis();
  // Detect a long gap since the previous call (e.g. just returned from steam
  // mode where pulseHeaters wasn't running). The main loop calls this every
  // ~10ms during normal pulsing, so any gap >200ms means another mode took
  // over. Reset the segment timer and force the boiler off so the next pulse
  // starts a clean cycle from a known state instead of toggling immediately
  // on stale heaterWave.
  if (now - lastInvocation > 200) {
    setBoilerOff();
    heaterState = false;
    heaterWave = now;
  }
  lastInvocation = now;

  if (!heaterState && ((now - heaterWave) > (pulseLength * factor_1))) {
    brewActive ? setBoilerOff() : setBoilerOn();
    heaterState = !heaterState;
    heaterWave = now;
  } else if (heaterState && ((now - heaterWave) > (pulseLength / factor_2))) {
    brewActive ? setBoilerOn() : setBoilerOff();
    heaterState = !heaterState;
    heaterWave = now;
  }
}

//#############################################################################################
//################################____STEAM_POWER_CONTROL____##################################
//#############################################################################################
void steamCtrl(const eepromValues_t &runningCfg, SensorState &currentState) {
  currentState.steamSwitchState ? lcdTargetState((int)HEATING::MODE_steam) : lcdTargetState((int)HEATING::MODE_brew); // setting the steam/hot water target temp
  // currentState.temperature is already calibrated (offset applied at read time
  // in sensorsReadTemperature), so compare directly against the user-facing
  // setpoint without re-applying offsetTemp on both sides.
  const uint16_t steamTempSetPoint = runningCfg.steamSetPoint;

  if (currentState.smoothedPressure > steamThreshold_ || currentState.temperature > steamTempSetPoint) {
    setBoilerOff();
    setSteamBoilerRelayOff();
    setSteamValveRelayOff();
    setPumpOff();
  } else {
    if (currentState.temperature < steamTempSetPoint) {
      setBoilerOn();
    } else {
      setBoilerOff();
    }
    setSteamValveRelayOn();
    setSteamBoilerRelayOn();
    #ifndef DREAM_STEAM_DISABLED // disabled for bigger boilers which have no  need of adding water during steaming
      if (currentState.smoothedPressure < activeSteamPressure_) {
        setPumpToRawValue(3);
      } else {
        setPumpOff();
      }
    #endif
  }

  /*In case steam is forgotten ON for more than 15 min*/
  if (currentState.smoothedPressure > passiveSteamPressure_) {
    currentState.isSteamForgottenON = millis() - steamTime >= STEAM_TIMEOUT;
  } else steamTime = millis();
}

/*Water mode and all that*/
void hotWaterMode(const SensorState &currentState) {
  closeValve();
  setPumpToRawValue(80);
  if (currentState.temperature < MAX_WATER_TEMP) setBoilerOn();
  else setBoilerOff();
}
