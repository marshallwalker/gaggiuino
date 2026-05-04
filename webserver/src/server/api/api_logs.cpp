#include "api_logs.h"

#include "ESPAsyncWebServer.h"
#include "AsyncTCP.h"
#include <ArduinoJson.h>
#include "../websocket/websocket.h"
#include "../../log/log.h"

void handleGetLogs(AsyncWebServerRequest* request);

void setupLogsApi(AsyncWebServer& server) {
  server.on("/api/logs", HTTP_GET, handleGetLogs);
}

void handleGetLogs(AsyncWebServerRequest* request) {
  LOG_INFO("Got request to fetch log history");

  AsyncResponseStream* response = request->beginResponseStream("application/json");
  // Generous size: up to ~100 entries * (source + message + JSON overhead)
  // 100 * 200 = 20kB headroom.
  DynamicJsonDocument json(20480);
  JsonArray entries = json.to<JsonArray>();

  const std::deque<LogEntry>& history = wsGetLogHistory();
  for (const auto& entry : history) {
    JsonObject obj = entries.createNestedObject();
    obj["source"] = entry.source;
    obj["log"] = entry.message;
  }

  serializeJson(entries, *response);
  request->send(response);
}
