#include <Arduino.h>
#include <esp_system.h>
#include "task_config.h"
#include "filesystem/filesystem.h"
#include "stm_comms/stm_comms.h"
#include "server/server_setup.h"
#include "wifi/wifi_setup.h"
#include "server/websocket/websocket.h"
#include "./log/log.h"

static const char* resetReasonName(esp_reset_reason_t reason) {
  switch (reason) {
    case ESP_RST_POWERON:    return "power-on";
    case ESP_RST_EXT:        return "external pin";
    case ESP_RST_SW:         return "software";
    case ESP_RST_PANIC:      return "panic / exception";
    case ESP_RST_INT_WDT:    return "interrupt watchdog";
    case ESP_RST_TASK_WDT:   return "task watchdog";
    case ESP_RST_WDT:        return "other watchdog";
    case ESP_RST_DEEPSLEEP:  return "deep sleep wake";
    case ESP_RST_BROWNOUT:   return "brownout";
    case ESP_RST_SDIO:       return "SDIO";
    default:                 return "unknown";
  }
}

void setup() {
  LOG_INIT();
  REMOTE_LOG_INIT([](std::string message) {wsSendLog(message);});
  LOG_INFO("ESP webserver booting (reset reason: %s, free heap %u bytes)",
    resetReasonName(esp_reset_reason()), (unsigned)ESP.getFreeHeap());
  initFS();
  LOG_INFO("Filesystem mounted");
  stmCommsInit(Serial1);
  LOG_INFO("STM comms task started");
  wifiSetup();
  LOG_INFO("WiFi setup complete");
  webServerSetup();
  LOG_INFO("Web server up; boot complete (free heap %u bytes)",
    (unsigned)ESP.getFreeHeap());
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

void onProfileDataSnapshotReceived(ProfileDataSnapshot&) {
  // Cached in stm_comms; no WS broadcast — the HTTP /api/profiles/{idx}
  // handler reads from that cache. Profile data isn't a live signal worth
  // streaming to all clients on every change.
}
