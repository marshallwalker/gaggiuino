#include "api_tof.h"

#include "ESPAsyncWebServer.h"
#include "AsyncTCP.h"
#include "../../stm_comms/stm_comms.h"
#include "../../log/log.h"

static void handleCalibrateFull(AsyncWebServerRequest* request) {
  LOG_INFO("ToF calibrate FULL requested via /api");
  stmCommsSendCalibrateTof(TofCalibrationTarget::TOF_CALIBRATE_FULL);
  request->send(200, "application/json", "{\"ok\":true}");
}

static void handleCalibrateEmpty(AsyncWebServerRequest* request) {
  LOG_INFO("ToF calibrate EMPTY requested via /api");
  stmCommsSendCalibrateTof(TofCalibrationTarget::TOF_CALIBRATE_EMPTY);
  request->send(200, "application/json", "{\"ok\":true}");
}

void setupTofApi(AsyncWebServer& server) {
  server.on("/api/tof/calibrate/full", HTTP_POST, handleCalibrateFull);
  server.on("/api/tof/calibrate/empty", HTTP_POST, handleCalibrateEmpty);
}
