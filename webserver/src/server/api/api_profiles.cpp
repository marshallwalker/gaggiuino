#include "api_profiles.h"

#include "ESPAsyncWebServer.h"
#include "AsyncTCP.h"
#include <ArduinoJson.h>
#include "../utils/server_utils.h"
#include "../../stm_comms/stm_comms.h"
#include "../../log/log.h"

void handleGetProfiles(AsyncWebServerRequest* request);
void handlePutActiveProfile(AsyncWebServerRequest* request, JsonVariant& body);

void setupProfilesApi(AsyncWebServer& server) {
  server.on("/api/profiles", HTTP_GET, handleGetProfiles);
  server.addHandler(jsonHandler("/api/profiles/active", HTTP_PUT, handlePutActiveProfile));
}

void handleGetProfiles(AsyncWebServerRequest* request) {
  LOG_INFO("Got request to list profiles");

  // Cache miss: ask the STM and wait briefly for the snapshot. Bounded wait
  // (~300 ms) so the AsyncTCP task isn't held up if the STM isn't responding.
  // Polling cadence is short (10 ms) so a healthy STM that turns it around in
  // ~50 ms doesn't pay the full budget.
  if (!stmCommsHasProfileNames()) {
    LOG_INFO("Profile names cache miss; requesting from STM");
    stmCommsSendRequestProfileNames();
    const TickType_t deadline = xTaskGetTickCount() + pdMS_TO_TICKS(300);
    while (!stmCommsHasProfileNames() && xTaskGetTickCount() < deadline) {
      vTaskDelay(pdMS_TO_TICKS(10));
    }
  }

  if (!stmCommsHasProfileNames()) {
    AsyncWebServerResponse* response = request->beginResponse(503, "application/json",
      "{\"result\":\"error\",\"message\":\"STM did not respond to profile names request\"}");
    request->send(response);
    return;
  }

  AsyncResponseStream* response = request->beginResponseStream("application/json");
  DynamicJsonDocument json(1024);
  JsonArray profiles = json.to<JsonArray>();

  const ProfileNamesSnapshot& snapshot = stmCommsGetCachedProfileNames();
  for (uint8_t i = 0; i < PROFILE_NAMES_COUNT; i++) {
    JsonObject profile = profiles.createNestedObject();
    profile["index"] = i + 1;
    profile["name"] = snapshot.names[i];
  }

  serializeJson(profiles, *response);
  request->send(response);
}

void handlePutActiveProfile(AsyncWebServerRequest* request, JsonVariant& body) {
  LOG_INFO("Got request to set active profile");

  int requestedIndex = body["index"].as<int>();
  if (requestedIndex < 1 || requestedIndex > PROFILE_NAMES_COUNT) {
    AsyncWebServerResponse* response = request->beginResponse(422, "application/json",
      "{\"result\":\"error\",\"message\":\"index must be between 1 and 5\"}");
    request->send(response);
    return;
  }

  stmCommsSendSelectProfile(static_cast<uint8_t>(requestedIndex));

  AsyncResponseStream* response = request->beginResponseStream("application/json");
  StaticJsonDocument<128> json;
  json["result"] = "ok";
  json["index"] = requestedIndex;
  serializeJson(json, *response);
  request->send(response);
}
