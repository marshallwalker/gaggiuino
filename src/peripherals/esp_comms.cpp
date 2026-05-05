/* 09:32 15/03/2023 - change triggering comment */
#include "esp_comms.h"
#include "pindef.h"
#include <string.h>

namespace {
  class McuCommsSingleton {
  public:
    static McuComms& getInstance() {
      static McuComms instance;
      return instance;
    }
  private:
    McuCommsSingleton() = default;
    ~McuCommsSingleton() = default;
  };
}

void espCommsInit() {
  USART_ESP.begin(460800);

  // mcuComms.setDebugPort(&USART_ESP);
  McuCommsSingleton::getInstance().begin(USART_ESP);

  // Set callbacks
  McuCommsSingleton::getInstance().setProfileReceivedCallback(onProfileReceived);
  McuCommsSingleton::getInstance().setRemoteScalesWeightReceivedCallback(onRemoteScalesWeightReceived);
  McuCommsSingleton::getInstance().setRemoteScalesDisconnectedCallback(onRemoteScalesDisconnected);
  McuCommsSingleton::getInstance().setSelectProfileCommandCallback(onSelectProfileReceived);
  McuCommsSingleton::getInstance().setCalibrateTofCommandCallback(onCalibrateTofReceived);
  McuCommsSingleton::getInstance().setScalesTareCommandCallback(onScalesTareReceived);
  McuCommsSingleton::getInstance().setScalesSetFactorsCommandCallback(onScalesSetFactorsReceived);
  McuCommsSingleton::getInstance().setRequestProfileNamesCallback(onRequestProfileNamesReceived);
  McuCommsSingleton::getInstance().setRequestProfileDataCallback(onRequestProfileDataReceived);
  McuCommsSingleton::getInstance().setSetProfileDataCommandCallback(onSetProfileDataReceived);
}

void espCommsReadData() {
  McuCommsSingleton::getInstance().readDataAndTick();
}

bool espCommsIsConnected() {
  return McuCommsSingleton::getInstance().isConnected();
}

volatile uint32_t sensorDataTimer = 0;
void espCommsSendSensorData(const SensorState& state, uint32_t frequency) {
  uint32_t now = millis();
  if (now - sensorDataTimer > frequency) {
    SensorStateSnapshot sensorSnapshot = SensorStateSnapshot{
      .brewActive = state.brewSwitchState,
      .steamActive = state.steamSwitchState,
      .scalesPresent = state.scalesPresent,
      .temperature = state.waterTemperature,
      .targetTemperature = state.currentTargetTemp,
      .pressure = state.smoothedPressure,
      .targetPressure = state.targetPressure,
      .pumpFlow = state.smoothedPumpFlow,
      .targetPumpFlow = state.targetPumpFlow,
      .weightFlow = state.smoothedWeightFlow,
      .weight = state.weight,
      .waterLvl = state.waterLvl,
      .tofRangeRaw = state.tofRangeRaw,
      .tofRangeFull = state.tofRangeFull,
      .tofRangeEmpty = state.tofRangeEmpty,
      .activeProfile = state.activeProfile
    };
    McuCommsSingleton::getInstance().sendSensorStateSnapshot(sensorSnapshot);
    sensorDataTimer = now;
  }
}

volatile uint32_t shotDataTimer;
void espCommsSendShotData(ShotSnapshot& shotData, uint32_t frequency) {
  uint32_t now = millis();
  if (now - shotDataTimer > frequency) {
    McuCommsSingleton::getInstance().sendShotData(shotData);
    shotDataTimer = now;
  }
}

void espCommsSendTareScalesCommand() {
  McuCommsSingleton::getInstance().sendRemoteScalesTare();
}

void espCommsSendProfileNames(const eepromValues_t& cfg) {
  ProfileNamesSnapshot snapshot = {};
  for (uint8_t i = 0; i < PROFILE_NAMES_COUNT; i++) {
    strncpy(snapshot.names[i], cfg.profiles[i].name, PROFILE_NAMES_LENGTH - 1);
    snapshot.names[i][PROFILE_NAMES_LENGTH - 1] = '\0';
  }
  McuCommsSingleton::getInstance().sendProfileNamesSnapshot(snapshot);
}

void espCommsSendProfileData(const eepromValues_t& cfg, uint8_t index) {
  // index is 1-indexed from the ESP. Bail with index=0 to signal "lookup
  // failed" so the caller knows not to cache the response.
  ProfileDataSnapshot snapshot = {};
  if (index < 1 || index > PROFILE_NAMES_COUNT) {
    snapshot.index = 0;
    McuCommsSingleton::getInstance().sendProfileDataSnapshot(snapshot);
    return;
  }
  const auto& p = cfg.profiles[index - 1];
  snapshot.index = index;
  strncpy(snapshot.name, p.name, PROFILE_DATA_NAME_LENGTH - 1);
  snapshot.name[PROFILE_DATA_NAME_LENGTH - 1] = '\0';
  // Preinfusion
  snapshot.preinfusionState = p.preinfusionState;
  snapshot.preinfusionFlowState = p.preinfusionFlowState;
  snapshot.preinfusionSec = p.preinfusionSec;
  snapshot.preinfusionBar = p.preinfusionBar;
  snapshot.preinfusionFlowVol = p.preinfusionFlowVol;
  snapshot.preinfusionFlowTime = p.preinfusionFlowTime;
  snapshot.preinfusionFlowPressureTarget = p.preinfusionFlowPressureTarget;
  snapshot.preinfusionPressureFlowTarget = p.preinfusionPressureFlowTarget;
  snapshot.preinfusionFilled = p.preinfusionFilled;
  snapshot.preinfusionPressureAbove = p.preinfusionPressureAbove;
  snapshot.preinfusionWeightAbove = p.preinfusionWeightAbove;
  // Soak
  snapshot.soakState = p.soakState;
  snapshot.soakTimePressure = p.soakTimePressure;
  snapshot.soakTimeFlow = p.soakTimeFlow;
  snapshot.soakKeepPressure = p.soakKeepPressure;
  snapshot.soakKeepFlow = p.soakKeepFlow;
  snapshot.soakBelowPressure = p.soakBelowPressure;
  snapshot.soakAbovePressure = p.soakAbovePressure;
  snapshot.soakAboveWeight = p.soakAboveWeight;
  // Ramp
  snapshot.preinfusionRamp = p.preinfusionRamp;
  snapshot.preinfusionRampSlope = p.preinfusionRampSlope;
  // Profiling - transition (pressure)
  snapshot.tpState = p.tpState;
  snapshot.tpType = p.tpType;
  snapshot.tpProfilingStart = p.tpProfilingStart;
  snapshot.tpProfilingFinish = p.tpProfilingFinish;
  snapshot.tpProfilingHold = p.tpProfilingHold;
  snapshot.tpProfilingHoldLimit = p.tpProfilingHoldLimit;
  snapshot.tpProfilingSlope = p.tpProfilingSlope;
  snapshot.tpProfilingSlopeShape = p.tpProfilingSlopeShape;
  snapshot.tpProfilingFlowRestriction = p.tpProfilingFlowRestriction;
  // Profiling - transition (flow)
  snapshot.tfProfileStart = p.tfProfileStart;
  snapshot.tfProfileEnd = p.tfProfileEnd;
  snapshot.tfProfileHold = p.tfProfileHold;
  snapshot.tfProfileHoldLimit = p.tfProfileHoldLimit;
  snapshot.tfProfileSlope = p.tfProfileSlope;
  snapshot.tfProfileSlopeShape = p.tfProfileSlopeShape;
  snapshot.tfProfilingPressureRestriction = p.tfProfilingPressureRestriction;
  // Profiling - main
  snapshot.profilingState = p.profilingState;
  snapshot.mfProfileState = p.mfProfileState;
  snapshot.mpProfilingStart = p.mpProfilingStart;
  snapshot.mpProfilingFinish = p.mpProfilingFinish;
  snapshot.mpProfilingSlope = p.mpProfilingSlope;
  snapshot.mpProfilingSlopeShape = p.mpProfilingSlopeShape;
  snapshot.mpProfilingFlowRestriction = p.mpProfilingFlowRestriction;
  snapshot.mfProfileStart = p.mfProfileStart;
  snapshot.mfProfileEnd = p.mfProfileEnd;
  snapshot.mfProfileSlope = p.mfProfileSlope;
  snapshot.mfProfileSlopeShape = p.mfProfileSlopeShape;
  snapshot.mfProfilingPressureRestriction = p.mfProfilingPressureRestriction;
  // Other
  snapshot.setpoint = p.setpoint;
  snapshot.stopOnWeightState = p.stopOnWeightState;
  snapshot.shotDose = p.shotDose;
  snapshot.shotStopOnCustomWeight = p.shotStopOnCustomWeight;
  snapshot.shotPreset = p.shotPreset;
  McuCommsSingleton::getInstance().sendProfileDataSnapshot(snapshot);
}

void espCommsSendLog(const char* message) {
  LogSnapshot snapshot = {};
  strncpy(snapshot.message, message, LOG_RECORD_LEN - 1);
  snapshot.message[LOG_RECORD_LEN - 1] = '\0';
  McuCommsSingleton::getInstance().sendLogRecord(snapshot);
}

volatile uint32_t scalesSnapshotTimer = 0;
void espCommsSendScalesSnapshot(const ScalesSnapshot& snapshot, uint32_t frequency) {
  uint32_t now = millis();
  if (now - scalesSnapshotTimer > frequency) {
    McuCommsSingleton::getInstance().sendScalesSnapshot(snapshot);
    scalesSnapshotTimer = now;
  }
}
