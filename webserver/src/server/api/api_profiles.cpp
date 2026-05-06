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
void handlePutProfileByIndex(AsyncWebServerRequest* request, JsonVariant& body);
static void serializeProfileSnapshot(const ProfileDataSnapshot& s, JsonObject& json);

void setupProfilesApi(AsyncWebServer& server) {
  // GET handler dispatches /api/profiles (names list) and
  // /api/profiles/<1..5> (per-profile detail) by parsing the URL —
  // ESPAsyncWebServer prefix-matches subpaths against this registration.
  server.on("/api/profiles", HTTP_GET, handleGetProfiles);
  // Active-profile PUT — register FIRST so /api/profiles/active hits this
  // exact-match handler before falling through to the prefix-matched slot
  // PUT below.
  server.addHandler(jsonHandler("/api/profiles/active", HTTP_PUT, handlePutActiveProfile));
  // Per-slot PUT — prefix-matches /api/profiles/<N>, dispatches by URL inside.
  server.addHandler(jsonHandler("/api/profiles", HTTP_PUT, handlePutProfileByIndex));
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

  // Cache miss: nudge the walker and wait. Same checksum-driven sync as
  // for per-profile data — in steady state this never fires.
  if (!stmCommsHasProfileNames()) {
    LOG_INFO("Profile names cache miss; nudging walker");
    stmCommsInvalidateProfileNamesCache();
    const TickType_t deadline = xTaskGetTickCount() + pdMS_TO_TICKS(800);
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

  // Cache miss: nudge the walker (the single source of profile-data
  // requests) and wait. In steady state the cache is kept fresh by the
  // checksum-driven sync in stmCommsTask, so this path only runs on cold
  // boot before the first sensor frame lands or if a previous walker
  // attempt's multi-packet response was dropped on the wire.
  if (!stmCommsHasProfileData(index)) {
    LOG_INFO("Profile-data cache miss for %u; nudging walker", index);
    stmCommsInvalidateProfileDataCache(index);
    const TickType_t deadline = xTaskGetTickCount() + pdMS_TO_TICKS(800);
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
  // Generous: ~50 fields × ~30 bytes per JSON pair = ~1.5KB. 4KB headroom.
  DynamicJsonDocument json(4096);
  JsonObject obj = json.to<JsonObject>();
  serializeProfileSnapshot(stmCommsGetCachedProfileData(index), obj);
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

void handlePutProfileByIndex(AsyncWebServerRequest* request, JsonVariant& body) {
  // Parse the index out of /api/profiles/<N>. Anything that doesn't look
  // like a single-digit slot path 404s.
  String url = request->url();
  if (url.length() != 15 /* strlen("/api/profiles/N") */) {
    request->send(404, "application/json", "{\"result\":\"error\",\"message\":\"unknown profiles path\"}");
    return;
  }
  char c = url.charAt(14);
  if (!isDigit(c)) {
    request->send(404, "application/json", "{\"result\":\"error\",\"message\":\"unknown profiles path\"}");
    return;
  }
  uint8_t idx = (uint8_t)(c - '0');
  if (idx < 1 || idx > PROFILE_NAMES_COUNT) {
    request->send(400, "application/json", "{\"result\":\"error\",\"message\":\"index out of range\"}");
    return;
  }

  LOG_INFO("Got PUT /api/profiles/%u", idx);

  // Build snapshot from JSON body. Missing fields fall back to whatever's
  // currently cached so partial-update PATCH-style requests work.
  ProfileDataSnapshot snap = {};
  if (stmCommsHasProfileData(idx)) {
    snap = stmCommsGetCachedProfileData(idx);
  }
  snap.index = idx;

  const char* name = body["name"] | snap.name;
  strncpy(snap.name, name, PROFILE_DATA_NAME_LENGTH - 1);
  snap.name[PROFILE_DATA_NAME_LENGTH - 1] = '\0';

  // Preinfusion
  snap.preinfusionState = body["preinfusionState"] | snap.preinfusionState;
  snap.preinfusionFlowState = body["preinfusionFlowState"] | snap.preinfusionFlowState;
  snap.preinfusionSec = body["preinfusionSec"] | snap.preinfusionSec;
  snap.preinfusionBar = body["preinfusionBar"] | snap.preinfusionBar;
  snap.preinfusionFlowVol = body["preinfusionFlowVol"] | snap.preinfusionFlowVol;
  snap.preinfusionFlowTime = body["preinfusionFlowTime"] | snap.preinfusionFlowTime;
  snap.preinfusionFlowPressureTarget = body["preinfusionFlowPressureTarget"] | snap.preinfusionFlowPressureTarget;
  snap.preinfusionPressureFlowTarget = body["preinfusionPressureFlowTarget"] | snap.preinfusionPressureFlowTarget;
  snap.preinfusionFilled = body["preinfusionFilled"] | snap.preinfusionFilled;
  snap.preinfusionPressureAbove = body["preinfusionPressureAbove"] | snap.preinfusionPressureAbove;
  snap.preinfusionWeightAbove = body["preinfusionWeightAbove"] | snap.preinfusionWeightAbove;
  // Soak
  snap.soakState = body["soakState"] | snap.soakState;
  snap.soakTimePressure = body["soakTimePressure"] | snap.soakTimePressure;
  snap.soakTimeFlow = body["soakTimeFlow"] | snap.soakTimeFlow;
  snap.soakKeepPressure = body["soakKeepPressure"] | snap.soakKeepPressure;
  snap.soakKeepFlow = body["soakKeepFlow"] | snap.soakKeepFlow;
  snap.soakBelowPressure = body["soakBelowPressure"] | snap.soakBelowPressure;
  snap.soakAbovePressure = body["soakAbovePressure"] | snap.soakAbovePressure;
  snap.soakAboveWeight = body["soakAboveWeight"] | snap.soakAboveWeight;
  // Ramp
  snap.preinfusionRamp = body["preinfusionRamp"] | snap.preinfusionRamp;
  snap.preinfusionRampSlope = body["preinfusionRampSlope"] | snap.preinfusionRampSlope;
  // Profiling - transition (pressure)
  snap.tpState = body["tpState"] | snap.tpState;
  snap.tpType = body["tpType"] | snap.tpType;
  snap.tpProfilingStart = body["tpProfilingStart"] | snap.tpProfilingStart;
  snap.tpProfilingFinish = body["tpProfilingFinish"] | snap.tpProfilingFinish;
  snap.tpProfilingHold = body["tpProfilingHold"] | snap.tpProfilingHold;
  snap.tpProfilingHoldLimit = body["tpProfilingHoldLimit"] | snap.tpProfilingHoldLimit;
  snap.tpProfilingSlope = body["tpProfilingSlope"] | snap.tpProfilingSlope;
  snap.tpProfilingSlopeShape = body["tpProfilingSlopeShape"] | snap.tpProfilingSlopeShape;
  snap.tpProfilingFlowRestriction = body["tpProfilingFlowRestriction"] | snap.tpProfilingFlowRestriction;
  // Profiling - transition (flow)
  snap.tfProfileStart = body["tfProfileStart"] | snap.tfProfileStart;
  snap.tfProfileEnd = body["tfProfileEnd"] | snap.tfProfileEnd;
  snap.tfProfileHold = body["tfProfileHold"] | snap.tfProfileHold;
  snap.tfProfileHoldLimit = body["tfProfileHoldLimit"] | snap.tfProfileHoldLimit;
  snap.tfProfileSlope = body["tfProfileSlope"] | snap.tfProfileSlope;
  snap.tfProfileSlopeShape = body["tfProfileSlopeShape"] | snap.tfProfileSlopeShape;
  snap.tfProfilingPressureRestriction = body["tfProfilingPressureRestriction"] | snap.tfProfilingPressureRestriction;
  // Profiling - main
  snap.profilingState = body["profilingState"] | snap.profilingState;
  snap.mfProfileState = body["mfProfileState"] | snap.mfProfileState;
  snap.mpProfilingStart = body["mpProfilingStart"] | snap.mpProfilingStart;
  snap.mpProfilingFinish = body["mpProfilingFinish"] | snap.mpProfilingFinish;
  snap.mpProfilingSlope = body["mpProfilingSlope"] | snap.mpProfilingSlope;
  snap.mpProfilingSlopeShape = body["mpProfilingSlopeShape"] | snap.mpProfilingSlopeShape;
  snap.mpProfilingFlowRestriction = body["mpProfilingFlowRestriction"] | snap.mpProfilingFlowRestriction;
  snap.mfProfileStart = body["mfProfileStart"] | snap.mfProfileStart;
  snap.mfProfileEnd = body["mfProfileEnd"] | snap.mfProfileEnd;
  snap.mfProfileSlope = body["mfProfileSlope"] | snap.mfProfileSlope;
  snap.mfProfileSlopeShape = body["mfProfileSlopeShape"] | snap.mfProfileSlopeShape;
  snap.mfProfilingPressureRestriction = body["mfProfilingPressureRestriction"] | snap.mfProfilingPressureRestriction;
  // Other
  snap.setpoint = body["setpoint"] | snap.setpoint;
  snap.stopOnWeightState = body["stopOnWeightState"] | snap.stopOnWeightState;
  snap.shotDose = body["shotDose"] | snap.shotDose;
  snap.shotStopOnCustomWeight = body["shotStopOnCustomWeight"] | snap.shotStopOnCustomWeight;
  snap.shotPreset = body["shotPreset"] | snap.shotPreset;

  // Invalidate the cache so we can detect when the STM's write-confirmation
  // arrives — the STM responds to a successful set by re-pushing the
  // (possibly clamped) profile data, which re-populates the cache.
  stmCommsInvalidateProfileDataCache(idx);
  stmCommsSendProfileDataSet(snap);

  // Bounded wait for confirmation. EEPROM writes can take a few hundred ms
  // on the FlashStorage_STM32 lib, so 800ms gives headroom.
  const TickType_t deadline = xTaskGetTickCount() + pdMS_TO_TICKS(800);
  while (!stmCommsHasProfileData(idx) && xTaskGetTickCount() < deadline) {
    vTaskDelay(pdMS_TO_TICKS(10));
  }

  if (!stmCommsHasProfileData(idx)) {
    request->send(503, "application/json",
      "{\"result\":\"error\",\"message\":\"STM did not confirm profile write (timeout or rejected — check logs)\"}");
    return;
  }

  // Echo back the actually-persisted snapshot so the UI sees any STM-side
  // clamping applied.
  AsyncResponseStream* response = request->beginResponseStream("application/json");
  DynamicJsonDocument json(4096);
  JsonObject obj = json.to<JsonObject>();
  serializeProfileSnapshot(stmCommsGetCachedProfileData(idx), obj);
  serializeJson(json, *response);
  request->send(response);
}

// Shared serializer used by GET and PUT-echo paths.
static void serializeProfileSnapshot(const ProfileDataSnapshot& s, JsonObject& json) {
  json["index"] = s.index;
  json["name"] = s.name;
  // Preinfusion
  json["preinfusionState"] = s.preinfusionState;
  json["preinfusionFlowState"] = s.preinfusionFlowState;
  json["preinfusionSec"] = s.preinfusionSec;
  json["preinfusionBar"] = s.preinfusionBar;
  json["preinfusionFlowVol"] = s.preinfusionFlowVol;
  json["preinfusionFlowTime"] = s.preinfusionFlowTime;
  json["preinfusionFlowPressureTarget"] = s.preinfusionFlowPressureTarget;
  json["preinfusionPressureFlowTarget"] = s.preinfusionPressureFlowTarget;
  json["preinfusionFilled"] = s.preinfusionFilled;
  json["preinfusionPressureAbove"] = s.preinfusionPressureAbove;
  json["preinfusionWeightAbove"] = s.preinfusionWeightAbove;
  // Soak
  json["soakState"] = s.soakState;
  json["soakTimePressure"] = s.soakTimePressure;
  json["soakTimeFlow"] = s.soakTimeFlow;
  json["soakKeepPressure"] = s.soakKeepPressure;
  json["soakKeepFlow"] = s.soakKeepFlow;
  json["soakBelowPressure"] = s.soakBelowPressure;
  json["soakAbovePressure"] = s.soakAbovePressure;
  json["soakAboveWeight"] = s.soakAboveWeight;
  // Ramp
  json["preinfusionRamp"] = s.preinfusionRamp;
  json["preinfusionRampSlope"] = s.preinfusionRampSlope;
  // Profiling - transition (pressure)
  json["tpState"] = s.tpState;
  json["tpType"] = s.tpType;
  json["tpProfilingStart"] = s.tpProfilingStart;
  json["tpProfilingFinish"] = s.tpProfilingFinish;
  json["tpProfilingHold"] = s.tpProfilingHold;
  json["tpProfilingHoldLimit"] = s.tpProfilingHoldLimit;
  json["tpProfilingSlope"] = s.tpProfilingSlope;
  json["tpProfilingSlopeShape"] = s.tpProfilingSlopeShape;
  json["tpProfilingFlowRestriction"] = s.tpProfilingFlowRestriction;
  // Profiling - transition (flow)
  json["tfProfileStart"] = s.tfProfileStart;
  json["tfProfileEnd"] = s.tfProfileEnd;
  json["tfProfileHold"] = s.tfProfileHold;
  json["tfProfileHoldLimit"] = s.tfProfileHoldLimit;
  json["tfProfileSlope"] = s.tfProfileSlope;
  json["tfProfileSlopeShape"] = s.tfProfileSlopeShape;
  json["tfProfilingPressureRestriction"] = s.tfProfilingPressureRestriction;
  // Profiling - main
  json["profilingState"] = s.profilingState;
  json["mfProfileState"] = s.mfProfileState;
  json["mpProfilingStart"] = s.mpProfilingStart;
  json["mpProfilingFinish"] = s.mpProfilingFinish;
  json["mpProfilingSlope"] = s.mpProfilingSlope;
  json["mpProfilingSlopeShape"] = s.mpProfilingSlopeShape;
  json["mpProfilingFlowRestriction"] = s.mpProfilingFlowRestriction;
  json["mfProfileStart"] = s.mfProfileStart;
  json["mfProfileEnd"] = s.mfProfileEnd;
  json["mfProfileSlope"] = s.mfProfileSlope;
  json["mfProfileSlopeShape"] = s.mfProfileSlopeShape;
  json["mfProfilingPressureRestriction"] = s.mfProfilingPressureRestriction;
  // Other
  json["setpoint"] = s.setpoint;
  json["stopOnWeightState"] = s.stopOnWeightState;
  json["shotDose"] = s.shotDose;
  json["shotStopOnCustomWeight"] = s.shotStopOnCustomWeight;
  json["shotPreset"] = s.shotPreset;
}
