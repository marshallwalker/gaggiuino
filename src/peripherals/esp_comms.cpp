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
      .pumpFlow = state.smoothedPumpFlow,
      .weightFlow = state.smoothedWeightFlow,
      .weight = state.weight,
      .waterLvl = state.waterLvl,
      .tofRangeRaw = state.tofRangeRaw,
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
