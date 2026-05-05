#include "wifi_setup.h"
#include <WiFi.h>
#include <vector>
#include "../task_config.h"
#include "../log/log.h"

/**
  * Helper class for persisting and retrieving WiFi connection credentials
  */
class WiFiParams {
private:
  String ssid = "";
  String pass = "";
  Preferences preferences;
public:
  String getSSID() { return ssid; }
  String getPass() { return pass; }
  bool hasCredentials() { return ssid != ""; };
  void saveCredentials(String ssid, String pass);
  void init();
  void reset();
};

namespace wifi {
  WiFiParams credentials;
  SemaphoreHandle_t lock = xSemaphoreCreateRecursiveMutex();
  std::vector<WiFiNetwork> networks;
  const uint32_t MAINTAIN_CONNECTION_EVERY = 10000;
}

void wifiTask(void* params);

// Edge-detected WiFi state-change logging. The 10-second maintenance loop
// can miss transient drops + reconnects entirely; this catches every state
// transition the ESP32 driver fires, both station and AP-side.
static void onWiFiEvent(WiFiEvent_t event, WiFiEventInfo_t info) {
  switch (event) {
    case ARDUINO_EVENT_WIFI_STA_CONNECTED:
      LOG_INFO("WiFi STA: associated with AP");
      break;
    case ARDUINO_EVENT_WIFI_STA_DISCONNECTED: {
      uint8_t reason = info.wifi_sta_disconnected.reason;
      LOG_ERROR("WiFi STA: disconnected (reason=%u)", reason);
      break;
    }
    case ARDUINO_EVENT_WIFI_STA_GOT_IP:
      LOG_INFO("WiFi STA: got IP %s", WiFi.localIP().toString().c_str());
      break;
    case ARDUINO_EVENT_WIFI_STA_LOST_IP:
      LOG_ERROR("WiFi STA: lost IP");
      break;
    case ARDUINO_EVENT_WIFI_AP_STACONNECTED:
      LOG_INFO("WiFi AP: client joined");
      break;
    case ARDUINO_EVENT_WIFI_AP_STADISCONNECTED:
      LOG_INFO("WiFi AP: client left");
      break;
    case ARDUINO_EVENT_WIFI_AP_START:
      LOG_INFO("WiFi AP: started");
      break;
    case ARDUINO_EVENT_WIFI_AP_STOP:
      LOG_INFO("WiFi AP: stopped");
      break;
    default:
      // Other events (PROBE_REQ, scan_done, etc.) are too chatty to surface.
      break;
  }
}

void wifiSetup() {
  // Edge-detected event logging registered before bringing the radio up so
  // even the AP_START event fires through here.
  WiFi.onEvent(onWiFiEvent);

  // Initialize WiFi connectivity
  WiFi.mode(WIFI_AP_STA);

  // Setup Access Point - Default: 192.168.4.1
  WiFi.softAP("Gaggiuino AP", NULL);
  LOG_INFO("AP (Access Point) IP address: %s", WiFi.softAPIP().toString().c_str());

  // Connect to saved network if one exists
  wifi::credentials.init();
  if (!wifi::credentials.hasCredentials()) {
    LOG_INFO("No ssid or password provided.");
  }
  else {
    LOG_INFO("Will attempt connecting to %s - %s", wifi::credentials.getSSID().c_str(), "***");
    wifiConnect(wifi::credentials.getSSID(), wifi::credentials.getPass());
  }

  // Start task to maintain the wifi connection
  xTaskCreateUniversal(&wifiTask, "wifi_maintenance", configMINIMAL_STACK_SIZE + 2048, NULL, PRIORITY_WIFI_MAINTENANCE, NULL, CORE_WIFI_MAINTENANCE);
}

std::list<WiFiNetwork> wifiAvailableNetworks() {
  std::list<WiFiNetwork> copy;
  if (xSemaphoreTakeRecursive(wifi::lock, portMAX_DELAY) == pdPASS) {
    for (auto& network : wifi::networks) {
      copy.push_back(network);
    }
    xSemaphoreGiveRecursive(wifi::lock);
  }
  return copy;
}

WiFiConnection getWiFiConnection() {
  String mac = WiFi.macAddress();  // STA MAC; valid even when not associated
  if (WiFi.isConnected()) {
    return WiFiConnection{ .ssid = WiFi.SSID(), .ip = WiFi.localIP().toString(), .mac = mac };
  }
  return WiFiConnection{ .ssid = "", .ip = "", .mac = mac };
}

void wifiDisconnect() {
  if (xSemaphoreTakeRecursive(wifi::lock, portMAX_DELAY) == pdFALSE) return;

  if (WiFi.isConnected()) {
    WiFi.disconnect();
    wifi::credentials.reset();
    LOG_INFO("Disconnected from WiFi and cleared saved WiFi.");
  }

  xSemaphoreGiveRecursive(wifi::lock);
}

// -------------------------------------------------------------------
// ----------------- Connect to a WiFi network -----------------------
// -------------------------------------------------------------------
bool wifiConnect(String ssid, String pass, const uint32_t timeout) {
  if (xSemaphoreTakeRecursive(wifi::lock, portMAX_DELAY) == pdFALSE) return false;

  if (WiFi.isConnected()) {
    WiFi.disconnect();
  }

  WiFi.begin(ssid.c_str(), pass.c_str());
  LOG_INFO("Connecting to WiFi [%s]", ssid.c_str());

  if (WiFi.waitForConnectResult(timeout) != WL_CONNECTED) {
    LOG_INFO("Failed to connect. Check password.");
    xSemaphoreGiveRecursive(wifi::lock);
    return false;
  }

  LOG_INFO("Connected to WiFi [%s] with IP:[%s]", WiFi.SSID().c_str(), WiFi.localIP().toString().c_str());
  wifi::credentials.saveCredentials(ssid, pass);

  xSemaphoreGiveRecursive(wifi::lock);
  return true;
}

// -------------------------------------------------------------------
// ---------------- Scan for available networks ----------------------
// -------------------------------------------------------------------
void updateAvailableNetworks(uint16_t count);

void wifiRefreshNetworks() {
  LOG_INFO("Starting a new WiFi scan");

  uint16_t count = WiFi.scanNetworks(false, false, false, 50U);
  updateAvailableNetworks(count);
}

void updateAvailableNetworks(uint16_t count) {
  if (xSemaphoreTakeRecursive(wifi::lock, portMAX_DELAY) == pdTRUE) {
    LOG_INFO("WiFi scan completed. Updating networks in RAM");
    wifi::networks.clear();

    // Limit the networks to the top 15 discovered.
    // The networks are returned by the WiFi library ordered by strength of signal
    for (int i = 0; i < count && i < 15; i++) {
      wifi::networks.push_back(WiFiNetwork{ WiFi.SSID(i), WiFi.RSSI(i), WiFi.encryptionType(i) == WIFI_AUTH_OPEN ? false : true });
    }

    xSemaphoreGiveRecursive(wifi::lock);
  }
}

// ------------------------------------------------------------
// ------------------ Connection Maintenance ------------------
// ------------------------------------------------------------
void wifiMaintainConnection() {
  if (WiFi.isConnected() || !wifi::credentials.hasCredentials()) {
    return;
  }

  LOG_INFO("WiFi disconnected, will attempt reconnection to %s", wifi::credentials.getSSID().c_str());
  wifiConnect(wifi::credentials.getSSID(), wifi::credentials.getPass(), 9000);
}

void wifiTask(void* params) {
  wifiRefreshNetworks();

  for (;;) {
    vTaskDelay(wifi::MAINTAIN_CONNECTION_EVERY / portTICK_PERIOD_MS);
    wifiMaintainConnection();
  }
}

// ----------------------------------------------------
// ------------------ WiFiParams ----------------------
// ----------------------------------------------------

void WiFiParams::saveCredentials(String ssid, String pass) {
  if (this->ssid == ssid && this->pass == pass) return;

  this->ssid = ssid;
  this->pass = pass;
  preferences.putString("ssid", ssid.c_str());
  preferences.putString("pass", pass.c_str());
  LOG_INFO("Saved wifi credentials [%s, %s]", ssid.c_str(), "*****");
}

void WiFiParams::init() {
  preferences.begin("gaggiuino_wifi");
  if (!hasCredentials()) {
    this->ssid = preferences.getString("ssid", "");
    this->pass = preferences.getString("pass", "");
  }
}

void WiFiParams::reset() {
  ssid = "";
  pass = "";
  preferences.clear();
}
