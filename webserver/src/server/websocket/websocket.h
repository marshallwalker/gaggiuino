#ifndef WEBSOCKET_API_H
#define WEBSOCKET_API_H

#include "ESPAsyncWebServer.h"
#include "AsyncTCP.h"
#include "mcu_comms.h"
#include <deque>
#include <string>

struct LogEntry {
  std::string source;
  std::string message;
};

void setupWebSocket(AsyncWebServer& server);
void wsCleanup();
void wsSendSensorStateSnapshotToClients(SensorStateSnapshot& snapshot);
void wsSendShotSnapshotToClients(ShotSnapshot& snapshot);
void wsSendProfileNamesSnapshotToClients(const ProfileNamesSnapshot& snapshot);
void wsSendScalesSnapshotToClients(const ScalesSnapshot& snapshot);
void wsSendLog(std::string log, std::string source = "webserver");
const std::deque<LogEntry>& wsGetLogHistory();

#endif
