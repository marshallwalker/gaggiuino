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
  // Checksum-driven sync state. The STM hashes runningCfg.profiles[] into
  // every SensorStateSnapshot (~1Hz). If the value here doesn't match the
  // last frame's, the cache is stale and the walker re-fetches all 5
  // ProfileDataSnapshots in the background. Sentinel 0 = "nothing seen yet"
  // — the first sensor frame from the STM will always look like a mismatch
  // and trigger an initial sync.
  uint32_t lastProfilesChecksum = 0;
  // staleProfileData[i] = true means slot (i+1)'s cache is invalid and the
  // walker should re-request it. Set on link-down and on checksum mismatch.
  bool staleProfileData[PROFILE_NAMES_COUNT] = { true, true, true, true, true };
  // Names list is also re-fetched on resync (cheap, single multi-packet) so
  // any rename done out-of-band (Nextion, factory reset) propagates.
  bool staleProfileNames = true;
}

void stmCommsTask(void* params);
void onSensorStateSnapshotInternal(SensorStateSnapshot& snapshot);
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
  // Sensor snapshots route through an internal trampoline that watches the
  // profilesChecksum field, then forwards to the externally-defined handler.
  mcuComms.setSensorStateSnapshotCallback(onSensorStateSnapshotInternal);
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
  // Cache walker. Each tick: if the names list is stale, request it; else
  // walk slots 1..5 looking for the first stale ProfileDataSnapshot and
  // request it. When all caches are fresh, idles. Triggered by:
  //   - link-down → mark everything stale
  //   - sensor frame with mismatched profilesChecksum → mark everything stale
  //   - boot (initial state is all stale)
  // One request per task tick spreads multi-packet responses out so the
  // STM's response stream doesn't pile up on the wire.
  for (;;) {
    stmCommsReadData();
    bool nowConnected = mcuComms.isConnected();
    if (nowConnected != prevConnected) {
      if (nowConnected) {
        LOG_INFO("STM link up");
      } else {
        LOG_ERROR("STM link down (no bytes for >6s)");
        // Reset the checksum so the next time the link comes up we re-sync
        // everything from scratch, even if the STM happened to compute the
        // same checksum it had before going dark.
        lastProfilesChecksum = 0;
        staleProfileNames = true;
        for (uint8_t i = 0; i < PROFILE_NAMES_COUNT; i++) staleProfileData[i] = true;
      }
      prevConnected = nowConnected;
    }
    if (nowConnected) {
      if (staleProfileNames) {
        stmCommsSendRequestProfileNames();
        staleProfileNames = false;  // optimistic; reset on link-down/checksum change
      } else {
        for (uint8_t i = 0; i < PROFILE_NAMES_COUNT; i++) {
          if (staleProfileData[i]) {
            stmCommsSendRequestProfileData(i + 1);
            staleProfileData[i] = false;  // optimistic
            break;  // one request per tick
          }
        }
      }
    }
    // 10 ms tick — fast enough that multi-packet responses (~6.7 ms on the
    // wire at 460800 baud) don't sit accumulating bytes in the UART buffer
    // for tens of ms before receiveMultiPacket() gets a chance to consume
    // them. Walking 5 slots = ~50 ms of wall-clock for a full re-sync.
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
  // Re-arm the walker so it issues a fresh request next tick. Used by the
  // PUT handler (after a write, to detect the STM's confirmation re-push)
  // and by GET-on-cache-miss (to recover from a dropped multi-packet
  // response without waiting for the next external checksum change).
  staleProfileData[index - 1] = true;
}

void stmCommsInvalidateProfileNamesCache() {
  hasProfileNames = false;
  staleProfileNames = true;
}

// Watch the profilesChecksum field on every sensor frame. If it changed,
// the STM's profile state diverged from what we have cached (web edit
// echo, Nextion edit, factory reset, brand-new boot) — invalidate the
// per-slot cache and queue a full re-sync via the walker. The forwarded
// callback drives the WS sensor stream as before.
void onSensorStateSnapshotInternal(SensorStateSnapshot& snapshot) {
  if (snapshot.profilesChecksum != 0 &&
      snapshot.profilesChecksum != lastProfilesChecksum) {
    LOG_INFO("Profiles checksum changed (0x%08x -> 0x%08x); resyncing cache",
      lastProfilesChecksum, snapshot.profilesChecksum);
    lastProfilesChecksum = snapshot.profilesChecksum;
    staleProfileNames = true;
    for (uint8_t i = 0; i < PROFILE_NAMES_COUNT; i++) staleProfileData[i] = true;
  }
  onSensorStateSnapshotReceived(snapshot);
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
