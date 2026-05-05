#include "api_scales.h"

#include "ESPAsyncWebServer.h"
#include "AsyncTCP.h"
#include <ArduinoJson.h>
#include "../../stm_comms/stm_comms.h"
#include "../../log/log.h"

static void handleTare(AsyncWebServerRequest* request) {
  LOG_INFO("Scales tare requested via /api");
  stmCommsSendScalesTare();
  request->send(200, "application/json", "{\"ok\":true}");
}

// Caches a per-request body buffer so we can parse JSON in the body handler.
// AsyncWebServerRequest streams the body in chunks; we accumulate then parse
// once `total` bytes have arrived.
static void handleSetFactorsBody(AsyncWebServerRequest* request, uint8_t* data, size_t len, size_t index, size_t total) {
  static String accumulated;
  if (index == 0) accumulated = "";
  accumulated.concat((const char*)data, len);
  if (index + len < total) return;

  StaticJsonDocument<128> doc;
  DeserializationError err = deserializeJson(doc, accumulated);
  accumulated = "";
  if (err) {
    LOG_ERROR("Scales factors body parse failed: %s", err.c_str());
    request->send(400, "application/json", "{\"ok\":false,\"error\":\"bad json\"}");
    return;
  }
  if (!doc.containsKey("factor1") || !doc.containsKey("factor2")) {
    request->send(400, "application/json", "{\"ok\":false,\"error\":\"factor1 + factor2 required\"}");
    return;
  }
  float f1 = doc["factor1"].as<float>();
  float f2 = doc["factor2"].as<float>();
  if (!isfinite(f1) || !isfinite(f2) || f1 <= 0.f || f2 <= 0.f) {
    request->send(400, "application/json", "{\"ok\":false,\"error\":\"factors must be > 0\"}");
    return;
  }
  LOG_INFO("Scales factors set via /api: f1=%.3f f2=%.3f", (double)f1, (double)f2);
  stmCommsSendScalesSetFactors(f1, f2);
  request->send(200, "application/json", "{\"ok\":true}");
}

static void handleSetFactorsNoBody(AsyncWebServerRequest* request) {
  // ESPAsyncWebServer will route POSTs without a body through here. We treat
  // this as an error since the caller needs to send {factor1, factor2}.
  request->send(400, "application/json", "{\"ok\":false,\"error\":\"empty body\"}");
}

static void handleGetState(AsyncWebServerRequest* request) {
  if (!stmCommsHasScalesSnapshot()) {
    request->send(503, "application/json", "{\"ok\":false,\"error\":\"no snapshot yet\"}");
    return;
  }
  const ScalesSnapshot& s = stmCommsGetCachedScalesSnapshot();
  StaticJsonDocument<256> doc;
  doc["present"] = s.present;
  doc["raw1"] = s.raw1;
  doc["raw2"] = s.raw2;
  doc["weight"] = s.weight;
  doc["factor1"] = s.factor1;
  doc["factor2"] = s.factor2;
  String out;
  serializeJson(doc, out);
  request->send(200, "application/json", out);
}

void setupScalesApi(AsyncWebServer& server) {
  server.on("/api/scales/tare", HTTP_POST, handleTare);
  server.on("/api/scales/state", HTTP_GET, handleGetState);
  server.on("/api/scales/factors", HTTP_POST, handleSetFactorsNoBody, NULL, handleSetFactorsBody);
}
