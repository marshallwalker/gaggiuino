#include "api_profiles.h"

#include "ESPAsyncWebServer.h"
#include "AsyncTCP.h"
#include <ArduinoJson.h>
#include "../utils/server_utils.h"
#include "../../stm_comms/stm_comms.h"
#include "../../log/log.h"

void handleGetProfiles(AsyncWebServerRequest* request);
void handleGetProfileByIndex(AsyncWebServerRequest* request, uint8_t index);
void handlePutActiveProfile(AsyncWebServerRequest* request, JsonVariant& body);

void setupProfilesApi(AsyncWebServer& server) {
  // Single GET handler dispatches /api/profiles (names list) and
  // /api/profiles/<1..5> (per-profile detail) by parsing the URL —
  // ESPAsyncWebServer prefix-matches subpaths against this registration.
  server.on("/api/profiles", HTTP_GET, handleGetProfiles);
  server.addHandler(jsonHandler("/api/profiles/active", HTTP_PUT, handlePutActiveProfile));
}

void handleGetProfiles(AsyncWebServerRequest* request) {
  // Dispatch /api/profiles (names list) vs /api/profiles/<1..5> (per-profile
  // detail) by parsing the suffix. ESPAsyncWebServer's prefix-matching
  // routes both shapes here.
  String url = request->url();
  if (url.length() > 14 /* strlen("/api/profiles/") */) {
    String suffix = url.substring(14);
    if (suffix.length() == 1 && isDigit(suffix.charAt(0))) {
      uint8_t idx = (uint8_t)(suffix.charAt(0) - '0');
      handleGetProfileByIndex(request, idx);
      return;
    }
    request->send(404, "application/json",
      "{\"result\":\"error\",\"message\":\"unknown profiles path\"}");
    return;
  }

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

void handleGetProfileByIndex(AsyncWebServerRequest* request, uint8_t index) {
  LOG_INFO("Got request for profile data index=%u", index);

  if (index < 1 || index > PROFILE_NAMES_COUNT) {
    request->send(400, "application/json", "{\"result\":\"error\",\"message\":\"index out of range\"}");
    return;
  }

  // Cache miss: ask the STM and wait briefly. Same bounded-poll pattern as
  // /api/profiles uses for names.
  if (!stmCommsHasProfileData(index)) {
    LOG_INFO("Profile-data cache miss for %u; requesting from STM", index);
    stmCommsSendRequestProfileData(index);
    const TickType_t deadline = xTaskGetTickCount() + pdMS_TO_TICKS(300);
    while (!stmCommsHasProfileData(index) && xTaskGetTickCount() < deadline) {
      vTaskDelay(pdMS_TO_TICKS(10));
    }
  }

  if (!stmCommsHasProfileData(index)) {
    request->send(503, "application/json",
      "{\"result\":\"error\",\"message\":\"STM did not respond to profile data request\"}");
    return;
  }

  AsyncResponseStream* response = request->beginResponseStream("application/json");
  StaticJsonDocument<256> json;
  const ProfileDataSnapshot& s = stmCommsGetCachedProfileData(index);
  json["index"] = s.index;
  json["name"] = s.name;
  json["preinfusionSec"] = s.preinfusionSec;
  json["preinfusionBar"] = s.preinfusionBar;
  json["setpoint"] = s.setpoint;
  json["shotDose"] = s.shotDose;
  json["shotStopOnCustomWeight"] = s.shotStopOnCustomWeight;
  json["stopOnWeightState"] = s.stopOnWeightState;
  serializeJson(json, *response);
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
