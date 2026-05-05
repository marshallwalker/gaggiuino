#include "stm_comms.h"
#include "../task_config.h"

namespace {
  McuComms mcuComms;
  SemaphoreHandle_t mcucLock = xSemaphoreCreateRecursiveMutex();
  ProfileNamesSnapshot lastProfileNames = {};
  bool hasProfileNames = false;
  ScalesSnapshot lastScalesSnapshot = {};
  bool hasScalesSnapshot = false;
}

void stmCommsTask(void* params);
void onProfileNamesSnapshotInternal(ProfileNamesSnapshot& snapshot);
void onScalesSnapshotInternal(ScalesSnapshot& snapshot);

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

  xTaskCreateUniversal(stmCommsTask, "stmComms", configMINIMAL_STACK_SIZE + 2400, NULL, PRIORITY_STM_COMMS, NULL, CORE_STM_COMMS);
}

void stmCommsTask(void* params) {
  for (;;) {
    stmCommsReadData();
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
