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
  // RX buffer needs to hold a worst-case multi-packet message between read
  // task ticks. ProfileDataSnapshot is ~250 bytes which serialises to ~5
  // SerialTransfer packets × ~62 wire bytes = ~310 bytes — already past the
  // old 256-byte limit, so per-profile-data responses were silently dropping
  // bytes before receiveMultiPacket() could drain them. 1024 covers the
  // current worst case plus headroom for back-to-back multi-packet pushes.
  serial.setRxBufferSize(1024);
  serial.setTxBufferSize(512);
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
  // Precache walker: on link-up we want the ESP cache pre-populated with the
  // names list and all 5 ProfileDataSnapshots so the first /api/profiles/N
  // GET is a cache hit instead of a multi-packet round trip. We send one
  // request per task tick (50 ms) rather than blasting all 6 at once so the
  // STM's response stream doesn't pile up multi-packet payloads on the link.
  // Step 0 = names, steps 1..5 = profile data per index, 6 = idle.
  uint8_t precacheStep = 6;
  for (;;) {
    stmCommsReadData();
    bool nowConnected = mcuComms.isConnected();
    if (nowConnected != prevConnected) {
      if (nowConnected) {
        LOG_INFO("STM link up; precaching profile names + 5 snapshots");
        precacheStep = 0;
      } else {
        LOG_ERROR("STM link down (no bytes for >6s)");
        precacheStep = 6;  // abandon any in-flight precache walk
      }
      prevConnected = nowConnected;
    }
    if (nowConnected && precacheStep < 6) {
      if (precacheStep == 0) {
        stmCommsSendRequestProfileNames();
      } else {
        stmCommsSendRequestProfileData(precacheStep);  // 1-indexed
      }
      precacheStep++;
    }
    // 10 ms tick instead of 50 ms — keeps the UART RX buffer drained quickly
    // enough that a multi-packet response (~6.7 ms on the wire at 460800
    // baud) doesn't sit accumulating bytes in the buffer for tens of ms
    // before receiveMultiPacket() gets a chance to consume it.
    vTaskDelay(10 / portTICK_PERIOD_MS);
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

void stmCommsSendProfileDataSet(const ProfileDataSnapshot& snapshot) {
  if (xSemaphoreTakeRecursive(mcucLock, portMAX_DELAY) == pdFALSE) return;
  mcuComms.sendProfileDataSet(snapshot);
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

void stmCommsInvalidateProfileDataCache(uint8_t index) {
  if (index < 1 || index > PROFILE_NAMES_COUNT) return;
  hasProfileData[index - 1] = false;
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
