#include "stm_comms.h"
#include "../task_config.h"
#include "../log/log.h"

namespace {
  McuComms mcuComms;
  SemaphoreHandle_t mcucLock = xSemaphoreCreateRecursiveMutex();
  ProfileNamesSnapshot lastProfileNames = {};
  bool hasProfileNames = false;
  ScalesSnapshot lastScalesSnapshot = {};
  bool hasScalesSnapshot = false;
  // Per-index profile-data cache. PROFILE_NAMES_COUNT comes from sensors_state.h
  // (transitively via mcu_comms.h) — same 5-slot ceiling the firmware uses.
  ProfileDataSnapshot lastProfileData[PROFILE_NAMES_COUNT] = {};
  bool hasProfileData[PROFILE_NAMES_COUNT] = {};
}

void stmCommsTask(void* params);
void onProfileNamesSnapshotInternal(ProfileNamesSnapshot& snapshot);
void onScalesSnapshotInternal(ScalesSnapshot& snapshot);
void onProfileDataSnapshotInternal(ProfileDataSnapshot& snapshot);

void stmCommsInit(HardwareSerial& serial) {
  serial.setRxBufferSize(256);
  serial.setTxBufferSize(256);
  serial.begin(460800);

  // mcuComms.setDebugPort(&Serial);
  mcuComms.begin(serial);

  // Set callbacks
  mcuComms.setShotSnapshotCallback(onShotSnapshotReceived);
  mcuComms.setSensorStateSnapshotCallback(onSensorStateSnapshotReceived);
  mcuComms.setRemoteScalesTareCommandCallback(onScalesTareReceived);
  mcuComms.setProfileNamesSnapshotCallback(onProfileNamesSnapshotInternal);
  mcuComms.setLogRecordReceivedCallback(onLogRecordReceived);
  mcuComms.setScalesSnapshotReceivedCallback(onScalesSnapshotInternal);
  mcuComms.setProfileDataSnapshotReceivedCallback(onProfileDataSnapshotInternal);

  xTaskCreateUniversal(stmCommsTask, "stmComms", configMINIMAL_STACK_SIZE + 2400, NULL, PRIORITY_STM_COMMS, NULL, CORE_STM_COMMS);
}

void stmCommsTask(void* params) {
  // Edge-detect mcuComms.isConnected() so we surface link state changes in
  // the log stream. "Connected" means we've seen a byte from the STM in the
  // last ~6 seconds (3× heartbeat interval).
  bool prevConnected = false;
  for (;;) {
    stmCommsReadData();
    bool nowConnected = mcuComms.isConnected();
    if (nowConnected != prevConnected) {
      if (nowConnected) {
        LOG_INFO("STM link up");
      } else {
        LOG_ERROR("STM link down (no bytes for >6s)");
      }
      prevConnected = nowConnected;
    }
    vTaskDelay(50 / portTICK_PERIOD_MS);
  }
}

void stmCommsReadData() {
  if (xSemaphoreTakeRecursive(mcucLock, portMAX_DELAY) == pdFALSE) return;
  mcuComms.readDataAndTick();
  xSemaphoreGiveRecursive(mcucLock);
}

void stmCommsSendWeight(float weight) {
  if (xSemaphoreTakeRecursive(mcucLock, portMAX_DELAY) == pdFALSE) return;
  mcuComms.sendRemoteScalesWeight(weight);
  xSemaphoreGiveRecursive(mcucLock);
}

void stmCommsSendScaleDisconnected() {
  if (xSemaphoreTakeRecursive(mcucLock, portMAX_DELAY) == pdFALSE) return;
  mcuComms.sendRemoteScalesDisconnected();
  xSemaphoreGiveRecursive(mcucLock);
}

void stmCommsSendSelectProfile(uint8_t index) {
  if (xSemaphoreTakeRecursive(mcucLock, portMAX_DELAY) == pdFALSE) return;
  mcuComms.sendSelectProfile(index);
  xSemaphoreGiveRecursive(mcucLock);
}

void stmCommsSendCalibrateTof(TofCalibrationTarget target) {
  if (xSemaphoreTakeRecursive(mcucLock, portMAX_DELAY) == pdFALSE) return;
  mcuComms.sendCalibrateTof(target);
  xSemaphoreGiveRecursive(mcucLock);
}

void stmCommsSendScalesTare() {
  if (xSemaphoreTakeRecursive(mcucLock, portMAX_DELAY) == pdFALSE) return;
  mcuComms.sendScalesTare();
  xSemaphoreGiveRecursive(mcucLock);
}

void stmCommsSendScalesSetFactors(float factor1, float factor2) {
  if (xSemaphoreTakeRecursive(mcucLock, portMAX_DELAY) == pdFALSE) return;
  mcuComms.sendScalesSetFactors(ScalesFactors{ .factor1 = factor1, .factor2 = factor2 });
  xSemaphoreGiveRecursive(mcucLock);
}

void stmCommsSendRequestProfileNames() {
  if (xSemaphoreTakeRecursive(mcucLock, portMAX_DELAY) == pdFALSE) return;
  mcuComms.sendRequestProfileNames();
  xSemaphoreGiveRecursive(mcucLock);
}

void stmCommsSendRequestProfileData(uint8_t index) {
  if (xSemaphoreTakeRecursive(mcucLock, portMAX_DELAY) == pdFALSE) return;
  mcuComms.sendRequestProfileData(index);
  xSemaphoreGiveRecursive(mcucLock);
}

bool stmCommsHasProfileNames() {
  return hasProfileNames;
}

const ProfileNamesSnapshot& stmCommsGetCachedProfileNames() {
  return lastProfileNames;
}

bool stmCommsHasScalesSnapshot() {
  return hasScalesSnapshot;
}

const ScalesSnapshot& stmCommsGetCachedScalesSnapshot() {
  return lastScalesSnapshot;
}

bool stmCommsHasProfileData(uint8_t index) {
  if (index < 1 || index > PROFILE_NAMES_COUNT) return false;
  return hasProfileData[index - 1];
}

const ProfileDataSnapshot& stmCommsGetCachedProfileData(uint8_t index) {
  // Caller is expected to check stmCommsHasProfileData first; this just
  // clamps to a safe slot if they don't.
  uint8_t slot = (index >= 1 && index <= PROFILE_NAMES_COUNT) ? index - 1 : 0;
  return lastProfileData[slot];
}

// Cache the snapshot before forwarding to the externally-defined handler so the
// HTTP API and new WebSocket clients can pull the latest names without a
// round-trip to the STM.
void onProfileNamesSnapshotInternal(ProfileNamesSnapshot& snapshot) {
  lastProfileNames = snapshot;
  hasProfileNames = true;
  onProfileNamesSnapshotReceived(snapshot);
}

// Cache the latest scales snapshot before forwarding so the HTTP /api/scales/state
// endpoint and any future late-joining websocket clients can see it without
// waiting for the next STM push.
void onScalesSnapshotInternal(ScalesSnapshot& snapshot) {
  lastScalesSnapshot = snapshot;
  hasScalesSnapshot = true;
  onScalesSnapshotReceived(snapshot);
}

// Cache profile-data responses by index so the GET /api/profiles/{idx}
// handler can return the cached copy after the first request and avoid a
// round-trip to the STM on every refresh.
void onProfileDataSnapshotInternal(ProfileDataSnapshot& snapshot) {
  if (snapshot.index >= 1 && snapshot.index <= PROFILE_NAMES_COUNT) {
    lastProfileData[snapshot.index - 1] = snapshot;
    hasProfileData[snapshot.index - 1] = true;
  }
  onProfileDataSnapshotReceived(snapshot);
}
