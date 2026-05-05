#include "server_setup.h"
#include "ESPAsyncWebServer.h"
#include "AsyncTCP.h"

#include "api/api_wifi.h"
#include "api/api_profiles.h"
#include "api/api_logs.h"
#include "api/api_tof.h"
#include "api/api_scales.h"
#include "api/api_static_files.h"
#include "api/api_not_found_handler.h"
#include "websocket/websocket.h"
#include "../task_config.h"
#include "../log/log.h"

namespace webserver {
  const int PORT_NUMBER = 80;
  AsyncWebServer server(PORT_NUMBER);
}

void webServerTask(void* params);

void webServerSetup() {
  setupWifiApi(webserver::server);
  setupProfilesApi(webserver::server);
  setupLogsApi(webserver::server);
  setupTofApi(webserver::server);
  setupScalesApi(webserver::server);
  setupWebSocket(webserver::server);
  setupStaticFiles(webserver::server);
  webserver::server.onNotFound(&handleUrlNotFound);

  LOG_INFO("Starting up web server on port %d...", webserver::PORT_NUMBER);
  webserver::server.begin();

  xTaskCreateUniversal(webServerTask, "webserverMaintenance", configMINIMAL_STACK_SIZE + 100, NULL, PRIORITY_WEBSERVER_MAINTENANCE, NULL, CORE_WEBSERVER_MAINTENANCE);
}

void webServerTask(void* params) {
  // Periodic free-heap snapshot for memory-leak detection. Once per minute
  // is enough to spot trends without spamming the log. Logs only on
  // meaningful change (≥4KB delta) so a stable build is silent and a
  // leaking one is visible.
  uint32_t lastHeapLogMs = 0;
  uint32_t lastHeapBytes = 0;
  while(true) {
    wsCleanup();
    uint32_t now = millis();
    if (now - lastHeapLogMs >= 60000u) {
      uint32_t heap = ESP.getFreeHeap();
      int32_t delta = (int32_t)heap - (int32_t)lastHeapBytes;
      if (lastHeapBytes == 0 || delta >= 4096 || delta <= -4096) {
        LOG_INFO("Free heap: %u bytes (delta %+d)", (unsigned)heap, (int)delta);
        lastHeapBytes = heap;
      }
      lastHeapLogMs = now;
    }
    vTaskDelay(100 / portTICK_PERIOD_MS);
  }
}
