#include "websocket.h"
#include "../../log/log.h"
#include "../../stm_comms/stm_comms.h"
#include <deque>
#include <WiFi.h>
#include "ESPAsyncWebServer.h"
#include "AsyncTCP.h"
#include <ArduinoJson.h>

const std::string WS_MSG_SENSOR_DATA = "sensor_data_update";
const std::string WS_MSG_SHOT_DATA = "shot_data_update";
const std::string WS_MSG_PROFILE_NAMES = "profile_names_update";
const std::string WS_MSG_LOG = "log_record";
const std::string WS_MSG_SCALES_DATA = "scales_data_update";

void wsSendProfileNamesToClient(AsyncWebSocketClient* client, const ProfileNamesSnapshot& snapshot);

namespace websocket {
  AsyncWebSocket wsServer("/ws");
  SemaphoreHandle_t jsonMutex = xSemaphoreCreateRecursiveMutex();
  DynamicJsonDocument jsonDoc(2048);

  bool lockJson() {
    return xSemaphoreTakeRecursive(jsonMutex, portMAX_DELAY) == pdTRUE;
  }

  void unlockJson() {
    jsonDoc.clear();
    xSemaphoreGiveRecursive(jsonMutex);
  }

  std::deque<std::string> msgBuffer;
  SemaphoreHandle_t bufferLock = xSemaphoreCreateRecursiveMutex();

  std::deque<LogEntry> logHistory;
  static const size_t LOG_HISTORY_MAX = 100;
  SemaphoreHandle_t logHistoryLock = xSemaphoreCreateRecursiveMutex();

  void wsSendWithBuffer(std::string message) {
    if (xSemaphoreTakeRecursive(bufferLock, portMAX_DELAY) == pdFALSE) return;

    msgBuffer.push_back(message);
    while (msgBuffer.size() > 50) {
      msgBuffer.pop_front();
    }

    while (wsServer.count() > 0 && !msgBuffer.empty()) {
      wsServer.textAll(msgBuffer.front().c_str(), msgBuffer.front().length());
      msgBuffer.pop_front();
    }
    xSemaphoreGiveRecursive(bufferLock);
  }
}

void handleWebSocketMessage(void* arg, uint8_t* data, size_t len);
void onEvent(AsyncWebSocket* server, AsyncWebSocketClient* client, AwsEventType type, void* arg, uint8_t* data, size_t len);

void setupWebSocket(AsyncWebServer& server) {
  websocket::wsServer.onEvent(&onEvent);
  server.addHandler(&websocket::wsServer);
}

void wsCleanup() {
  websocket::wsServer.cleanupClients();
}

void onEvent(
  AsyncWebSocket* server,
  AsyncWebSocketClient* client,
  AwsEventType          type,
  void* arg,
  uint8_t* data,
  size_t                len
) {
  switch (type) {
  case WS_EVT_CONNECT:
    LOG_INFO("WebSocket client #%u connected from %s", client->id(), client->remoteIP().toString().c_str());
    if (stmCommsHasProfileNames()) {
      wsSendProfileNamesToClient(client, stmCommsGetCachedProfileNames());
    }
    if (stmCommsHasScalesSnapshot()) {
      // Re-broadcast to all so the late-joining client sees the latest factors
      // and live raw values without waiting for the next 250ms STM push. The
      // overhead is one tiny message; existing clients will idempotently
      // overwrite the same snapshot they already have.
      wsSendScalesSnapshotToClients(stmCommsGetCachedScalesSnapshot());
    }
    break;
  case WS_EVT_DISCONNECT:
    LOG_INFO("WebSocket client #%u disconnected", client->id());
    break;
  case WS_EVT_DATA:
    handleWebSocketMessage(arg, data, len);
    break;
  case WS_EVT_PONG:
  case WS_EVT_ERROR:
    break;
  }
}

//-------------------------------------------------------------//
//--------------------------INCOMING---------------------------//
//-------------------------------------------------------------//

void handleWebSocketMessage(void* arg, uint8_t* data, size_t len) {
  AwsFrameInfo* info = (AwsFrameInfo*)arg;
  if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT) {
    if (!websocket::lockJson()) return;

    DeserializationError err = deserializeJson(websocket::jsonDoc, data);
    if (err) {
      LOG_ERROR("deserializeJson() failed with code %s", err.c_str());
      websocket::unlockJson();
      return;
    }

    const std::string action = websocket::jsonDoc["action"].as<std::string>();
    const std::string actionData = websocket::jsonDoc["data"].as<std::string>();
    LOG_INFO("Message: %s -> %s\n", action.c_str(), actionData.c_str());
    websocket::unlockJson();
  }
}

//-------------------------------------------------------------//
//--------------------------OUTGOING---------------------------//
//-------------------------------------------------------------//
void wsSendSensorStateSnapshotToClients(SensorStateSnapshot& snapshot) {
  if (!websocket::lockJson()) return;
  JsonObject root = websocket::jsonDoc.to<JsonObject>();

  root["action"] = WS_MSG_SENSOR_DATA;

  JsonObject data = root.createNestedObject("data");
  data["brewActive"] = snapshot.brewActive;
  data["steamActive"] = snapshot.steamActive;
  data["scalesPresent"] = snapshot.scalesPresent;
  data["temperature"] = snapshot.temperature;
  data["targetTemperature"] = snapshot.targetTemperature;
  data["waterLvl"] = snapshot.waterLvl;
  data["tofRangeRaw"] = snapshot.tofRangeRaw;
  data["pressure"] = snapshot.pressure;
  data["pumpFlow"] = snapshot.pumpFlow;
  data["weightFlow"] = snapshot.weightFlow;
  data["weight"] = snapshot.weight;
  data["activeProfile"] = snapshot.activeProfile;

  std::string serializedMsg; // create temp buffer
  serializeJson(root, serializedMsg);  // serialize to buffer
  websocket::unlockJson();

  websocket::wsServer.textAll(serializedMsg.c_str(), serializedMsg.length());
}

void wsSendShotSnapshotToClients(ShotSnapshot& snapshot) {
  if (!websocket::lockJson()) return;
  JsonObject root = websocket::jsonDoc.to<JsonObject>();

  root["action"] = WS_MSG_SHOT_DATA;

  JsonObject data = root.createNestedObject("data");
  data["timeInShot"] = snapshot.timeInShot;
  data["pressure"] = snapshot.pressure;
  data["pumpFlow"] = snapshot.pumpFlow;
  data["weightFlow"] = snapshot.weightFlow;
  data["temperature"] = snapshot.temperature;
  data["shotWeight"] = snapshot.shotWeight;
  data["waterPumped"] = snapshot.waterPumped;
  data["targetTemperature"] = snapshot.targetTemperature;
  data["targetPumpFlow"] = snapshot.targetPumpFlow;
  data["targetPressure"] = snapshot.targetPressure;

  std::string serializedMsg; // create temp buffer
  serializeJson(root, serializedMsg);  // serialize to buffer
  websocket::unlockJson();

  websocket::wsServer.textAll(serializedMsg.c_str(), serializedMsg.length());
}

// Builds the JSON payload for profile names. Caller owns the lock.
static std::string buildProfileNamesJson(const ProfileNamesSnapshot& snapshot) {
  JsonObject root = websocket::jsonDoc.to<JsonObject>();
  root["action"] = WS_MSG_PROFILE_NAMES;
  JsonArray profiles = root.createNestedArray("data");
  for (uint8_t i = 0; i < PROFILE_NAMES_COUNT; i++) {
    JsonObject profile = profiles.createNestedObject();
    profile["index"] = i + 1;
    profile["name"] = snapshot.names[i];
  }
  std::string serializedMsg;
  serializeJson(root, serializedMsg);
  return serializedMsg;
}

void wsSendProfileNamesSnapshotToClients(const ProfileNamesSnapshot& snapshot) {
  if (!websocket::lockJson()) return;
  std::string serializedMsg = buildProfileNamesJson(snapshot);
  websocket::unlockJson();
  websocket::wsServer.textAll(serializedMsg.c_str(), serializedMsg.length());
}

void wsSendProfileNamesToClient(AsyncWebSocketClient* client, const ProfileNamesSnapshot& snapshot) {
  if (!client) return;
  if (!websocket::lockJson()) return;
  std::string serializedMsg = buildProfileNamesJson(snapshot);
  websocket::unlockJson();
  client->text(serializedMsg.c_str(), serializedMsg.length());
}

void wsSendScalesSnapshotToClients(const ScalesSnapshot& snapshot) {
  if (!websocket::lockJson()) return;
  JsonObject root = websocket::jsonDoc.to<JsonObject>();

  root["action"] = WS_MSG_SCALES_DATA;
  JsonObject data = root.createNestedObject("data");
  data["present"] = snapshot.present;
  data["raw1"] = snapshot.raw1;
  data["raw2"] = snapshot.raw2;
  data["weight"] = snapshot.weight;
  data["factor1"] = snapshot.factor1;
  data["factor2"] = snapshot.factor2;

  std::string serializedMsg;
  serializeJson(root, serializedMsg);
  websocket::unlockJson();

  websocket::wsServer.textAll(serializedMsg.c_str(), serializedMsg.length());
}

void wsSendLog(std::string log, std::string source) {
  if (!websocket::lockJson()) return;
  JsonObject root = websocket::jsonDoc.to<JsonObject>();

  root["action"] = WS_MSG_LOG;

  JsonObject data = root.createNestedObject("data");
  data["source"] = source;
  data["log"] = log;

  std::string serializedMsg; // create temp buffer
  serializeJson(root, serializedMsg);  // serialize to buffer
  websocket::unlockJson();

  // Append to in-memory history so /api/logs and reconnecting clients can
  // replay recent lines after a browser refresh.
  if (xSemaphoreTakeRecursive(websocket::logHistoryLock, portMAX_DELAY) == pdTRUE) {
    websocket::logHistory.push_back({source, log});
    while (websocket::logHistory.size() > websocket::LOG_HISTORY_MAX) {
      websocket::logHistory.pop_front();
    }
    xSemaphoreGiveRecursive(websocket::logHistoryLock);
  }

  websocket::wsSendWithBuffer(serializedMsg);
}

const std::deque<LogEntry>& wsGetLogHistory() {
  return websocket::logHistory;
}
