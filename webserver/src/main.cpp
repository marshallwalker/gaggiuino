#include <Arduino.h>
#include "task_config.h"
#include "filesystem/filesystem.h"
#include "stm_comms/stm_comms.h"
#include "server/server_setup.h"
#include "wifi/wifi_setup.h"
#include "server/websocket/websocket.h"
#include "./log/log.h"

void setup() {
  LOG_INIT();
  REMOTE_LOG_INIT([](std::string message) {wsSendLog(message);});
  initFS();
  stmCommsInit(Serial1);
  wifiSetup();
  webServerSetup();
  vTaskDelete(NULL);     //Delete own task by passing NULL(task handle can also be used)
}

void loop() {
  vTaskDelete(NULL);     //Delete own task by passing NULL(task handle can also be used)
}

// ------------------------------------------------------------------------
// ---------------- Handle STM communication messages ---------------------
// ------------------------------------------------------------------------
void onSensorStateSnapshotReceived(SensorStateSnapshot& sensorData) {
  wsSendSensorStateSnapshotToClients(sensorData);
}

void onShotSnapshotReceived(ShotSnapshot& shotData) {
  wsSendShotSnapshotToClients(shotData);
}

void onScalesTareReceived() {
  // BLE scales support stripped from this build - no-op tare callback.
}

void onProfileNamesSnapshotReceived(ProfileNamesSnapshot& snapshot) {
  wsSendProfileNamesSnapshotToClients(snapshot);
}

void onLogRecordReceived(LogSnapshot& snapshot) {
  // Defensive null-termination before re-broadcasting.
  snapshot.message[LOG_RECORD_LEN - 1] = '\0';
  wsSendLog(std::string(snapshot.message), "stm");
}

void onScalesSnapshotReceived(ScalesSnapshot& snapshot) {
  wsSendScalesSnapshotToClients(snapshot);
}
