/* 09:32 15/03/2023 - change triggering comment */
#include "mcu_comms.h"
#include <stdarg.h>

using namespace std;

size_t ProfileSerializer::neededBufferSize(Profile& profile) const {
  return sizeof(profile.phaseCount()) + profile.phaseCount() * sizeof(Phase) + sizeof(profile.globalStopConditions);
}

vector<uint8_t> ProfileSerializer::serializeProfile(Profile& profile) const {
  vector<uint8_t> buffer;
  buffer.reserve(neededBufferSize(profile));
  size_t phaseCount = profile.phaseCount();

  memcpy(buffer.data(), &phaseCount, sizeof(phaseCount));
  memcpy(buffer.data() + sizeof(phaseCount), profile.phases.data(), phaseCount * sizeof(Phase));
  memcpy(buffer.data() + sizeof(phaseCount) + phaseCount * sizeof(Phase), &profile.globalStopConditions, sizeof(profile.globalStopConditions));

  return buffer;
}

void ProfileSerializer::deserializeProfile(vector<uint8_t>& buffer, Profile& profile) const {
  size_t phaseCount;
  memcpy(&phaseCount, buffer.data(), sizeof(profile.phaseCount()));
  profile.phases.clear();
  profile.phases.reserve(phaseCount);
  memcpy(profile.phases.data(), buffer.data() + sizeof(profile.phaseCount()), phaseCount * sizeof(Phase));
  memcpy(&profile.globalStopConditions, buffer.data() + sizeof(profile.phaseCount()) + phaseCount * sizeof(Phase), sizeof(profile.globalStopConditions));
}

//---------------------------------------------------------------------------------
//---------------------------    PRIVATE METHODS       ----------------------------
//---------------------------------------------------------------------------------
void McuComms::sendMultiPacket(vector<uint8_t>& buffer, size_t dataSize, uint8_t packetID) {
  log("Sending buffer[%d]: ", dataSize);
  logBufferHex(buffer, dataSize);

  auto dataPerPacket = static_cast<uint8_t>(packetSize - 2u); // Two bytes are reserved for current index and last index
  auto numPackets = static_cast<uint8_t>(dataSize / dataPerPacket);

  if (dataSize % dataPerPacket > 0u) // Add an extra transmission if needed
    numPackets++;

  for (uint8_t currentPacket = 0u; currentPacket < numPackets; currentPacket++) {
    uint8_t dataLen = dataPerPacket;


    if (((currentPacket + 1u) * dataPerPacket) > dataSize) // Determine data length for the last packet if file length is not an exact multiple of `dataPerPacket`
      dataLen = static_cast<uint8_t>(dataSize - currentPacket * dataPerPacket);

    uint16_t sendSize = transfer.txObj(numPackets - 1u, 0u); // index of last packet
    sendSize = transfer.txObj(currentPacket, (uint16_t)1); // index of current packet
    sendSize = transfer.txObj(buffer[currentPacket * dataPerPacket], (uint16_t)2, dataLen); // packet payload

    transfer.sendData(sendSize, packetID); // Send the current file index and data
  }
  log("Data sent.\n");
}

vector<uint8_t> McuComms::receiveMultiPacket() {
  uint8_t lastPacket = transfer.packet.rxBuff[0]; // Get index of last packet
  uint8_t currentPacket = transfer.packet.rxBuff[1]; // Get index of current packet
  uint8_t bytesRead = transfer.bytesRead; // Bytes read in current packet
  uint8_t dataPerPacket = bytesRead - (uint8_t)2; // First 2 bytes of each packet are used as indexes and are not put in the buffer
  size_t  totalBytes = 0u;

  vector<uint8_t> buffer;
  buffer.reserve((lastPacket + 1u) * dataPerPacket);

  while (currentPacket <= lastPacket) {
#ifdef ESP32
    esp_task_wdt_reset();
#endif

    log("Handling packet %d\n", currentPacket);
    totalBytes += bytesRead - 2u;

    // First 2 bytes are not added to the buffer because they represent the index of current and last packet
    for (uint8_t i = 0u; i < bytesRead - 2u; i++) {
      buffer.push_back(transfer.packet.rxBuff[i + 2u]);
    }
    if (currentPacket == lastPacket) break;

    // wait for more data to become available for up to 20 milliseconds
    uint8_t dataAvailable = transfer.available();

    uint32_t waitStartedAt = millis();
    while (millis() - waitStartedAt < 50u && !dataAvailable) {
#ifdef ESP32
      esp_task_wdt_reset();
#endif
      dataAvailable = transfer.available();
    }

    // if data is not available exit the loop
    if (!dataAvailable) {
      log("ERROR: esp_stm_comms read timeout error\n");
      break;
    }

    // if data is available parse the current packet and number of packets and put data in the buffer
    lastPacket = transfer.packet.rxBuff[0];
    currentPacket = transfer.packet.rxBuff[1];
    bytesRead = transfer.bytesRead;
  }

  log("Received buffer[%d]: ", totalBytes);
  logBufferHex(buffer, totalBytes);

  return buffer;
}


void McuComms::shotSnapshotReceived(ShotSnapshot& snapshot) const {
  if (shotSnapshotCallback) {
    shotSnapshotCallback(snapshot);
  }
}

void McuComms::profileReceived(Profile& profile) const {
  if (profileCallback) {
    profileCallback(profile);
  }
}

void McuComms::sensorStateSnapshotReceived(SensorStateSnapshot& snapshot) const {
  if (sensorStateSnapshotCallback) {
    sensorStateSnapshotCallback(snapshot);
  }
}

void McuComms::remoteScalesWeightReceived(float weight) const {
  if (remoteScalesWeightReceivedCallback) {
    remoteScalesWeightReceivedCallback(weight);
  }
}

void McuComms::remoteScalesTareCommandReceived() const {
  if (remoteScalesTareCommandCallback) {
    remoteScalesTareCommandCallback();
  }
}

void McuComms::remoteScalesDisconnected() const {
  if (remoteScalesDisconnectedCallback) {
    remoteScalesDisconnectedCallback();
  }
}

void McuComms::profileNamesSnapshotReceived(ProfileNamesSnapshot& snapshot) const {
  if (profileNamesSnapshotCallback) {
    profileNamesSnapshotCallback(snapshot);
  }
}

void McuComms::selectProfileCommandReceived(uint8_t index) const {
  if (selectProfileCommandCallback) {
    selectProfileCommandCallback(index);
  }
}

void McuComms::logRecordReceived(LogSnapshot& snapshot) const {
  if (logRecordCallback) {
    logRecordCallback(snapshot);
  }
}

void McuComms::responseReceived(McuCommsResponse& response) const {
  if (responseReceivedCallback) {
    responseReceivedCallback(response);
  }
}

void McuComms::log(const char* format, ...) const {
  if (!debugPort) return;

  std::array<char, 128>buffer;
  va_list args;
  va_start(args, format);
  vsnprintf(buffer.data(), buffer.size(), format, args);
  va_end(args);
  debugPort->print("McuComms: ");
  debugPort->print(buffer.data());
}

void McuComms::logBufferHex(vector<uint8_t>& buffer, size_t dataSize) const {
  if (!debugPort) return;

  std::array<char, 3>hex;
  for (size_t i = 0u; i < dataSize; i++) {
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wformat-truncation"
    snprintf(hex.data(), hex.max_size(), "%02x ", buffer[i]);
#pragma GCC diagnostic pop
    debugPort->print(hex.data());
  }
  debugPort->println();
}

void McuComms::establishConnection(uint32_t timeout) {
  if (timeout <= 0) return;

  uint32_t waitingStart = millis();

  while (millis() - waitingStart < timeout && lastByteReceived == 0) {
    sendHeartbeat();
    readDataAndTick();
    delay(10);
  }

  if (lastByteReceived > 0) {
    log("Successful connection after=%dms", millis() - waitingStart);
  }
  else {
    log("Unsuccessful connection after=%dms", millis() - waitingStart);
  }
}

void McuComms::sendHeartbeat() {
  uint16_t messageSize = transfer.txObj(static_cast<uint8_t>(McuCommsMessageType::MCUC_HEARTBEAT));
  transfer.sendData(messageSize, static_cast<uint8_t>(McuCommsMessageType::MCUC_HEARTBEAT));
}

//---------------------------------------------------------------------------------
//---------------------------    PUBLIC METHODS       ----------------------------
//---------------------------------------------------------------------------------
void McuComms::begin(Stream& serial, uint32_t waitConnectionMillis, size_t packetSize) {
  McuComms::packetSize = packetSize;
  log("Staring with packetSize: %d\n", packetSize);
  transfer.begin(serial, true);
  establishConnection(waitConnectionMillis);
}

void McuComms::setDebugPort(Stream* dbgPort) {
  McuComms::debugPort = dbgPort;
}

void McuComms::setShotSnapshotCallback(ShotSnapshotReceivedCallback callback) {
  shotSnapshotCallback = callback;
}

void McuComms::setProfileReceivedCallback(ProfileReceivedCallback callback) {
  profileCallback = callback;
}

void McuComms::setSensorStateSnapshotCallback(SensorStateSnapshotReceivedCallback callback) {
  sensorStateSnapshotCallback = callback;
}

void McuComms::setRemoteScalesWeightReceivedCallback(RemoteScalesWeightReceivedCallback callback) {
  remoteScalesWeightReceivedCallback = callback;
}

void McuComms::setRemoteScalesTareCommandCallback(RemoteScalesTareCommandCallback callback) {
  remoteScalesTareCommandCallback = callback;
}

void McuComms::setRemoteScalesDisconnectedCallback(RemoteScalesDisconnectedCallback callback) {
  remoteScalesDisconnectedCallback = callback;
}

void McuComms::setProfileNamesSnapshotCallback(ProfileNamesSnapshotReceivedCallback callback) {
  profileNamesSnapshotCallback = callback;
}

void McuComms::setSelectProfileCommandCallback(SelectProfileCommandCallback callback) {
  selectProfileCommandCallback = callback;
}

void McuComms::setLogRecordReceivedCallback(LogRecordReceivedCallback callback) {
  logRecordCallback = callback;
}

void McuComms::setResponseReceivedCallback(ResponseReceivedCallback callback) {
  responseReceivedCallback = callback;
}

void McuComms::sendShotData(const ShotSnapshot& snapshot) {
  if (!isConnected()) return;
  uint16_t messageSize = transfer.txObj(snapshot);
  transfer.sendData(messageSize, static_cast<uint8_t>(McuCommsMessageType::MCUC_DATA_SHOT_SNAPSHOT));
}

void McuComms::sendProfile(Profile& profile) {
  if (!isConnected()) return;
  size_t dataSize = profileSerializer.neededBufferSize(profile);
  vector<uint8_t> buffer = profileSerializer.serializeProfile(profile);
  sendMultiPacket(buffer, dataSize, static_cast<uint8_t>(McuCommsMessageType::MCUC_DATA_PROFILE));
}

void McuComms::sendSensorStateSnapshot(const SensorStateSnapshot& snapshot) {
  if (!isConnected()) return;
  uint16_t messageSize = transfer.txObj(snapshot);
  transfer.sendData(messageSize, static_cast<uint8_t>(McuCommsMessageType::MCUC_DATA_SENSOR_STATE_SNAPSHOT));
}

void McuComms::sendResponse(McuCommsResponse response) {
  if (!isConnected()) return;
  uint16_t messageSize = transfer.txObj(response);
  transfer.sendData(messageSize, static_cast<uint8_t>(McuCommsMessageType::MCUC_RESPONSE));
}

void McuComms::sendRemoteScalesWeight(float weight) {
  if (!isConnected()) return;
  uint16_t messageSize = transfer.txObj(weight);
  transfer.sendData(messageSize, static_cast<uint8_t>(McuCommsMessageType::MCUC_DATA_REMOTE_SCALES_WEIGHT));
}

void McuComms::sendRemoteScalesTare() {
  if (!isConnected()) return;
  uint16_t messageSize = transfer.txObj(static_cast<uint8_t>(McuCommsMessageType::MCUC_CMD_REMOTE_SCALES_TARE));
  transfer.sendData(messageSize, static_cast<uint8_t>(McuCommsMessageType::MCUC_CMD_REMOTE_SCALES_TARE));
}

void McuComms::sendRemoteScalesDisconnected() {
  if (!isConnected()) return;
  uint16_t messageSize = transfer.txObj(static_cast<uint8_t>(McuCommsMessageType::MCUC_DATA_REMOTE_SCALES_DISCONNECTED));
  transfer.sendData(messageSize, static_cast<uint8_t>(McuCommsMessageType::MCUC_DATA_REMOTE_SCALES_DISCONNECTED));
}

void McuComms::sendProfileNamesSnapshot(const ProfileNamesSnapshot& snapshot) {
  if (!isConnected()) return;
  std::vector<uint8_t> buffer(sizeof(ProfileNamesSnapshot));
  memcpy(buffer.data(), &snapshot, sizeof(ProfileNamesSnapshot));
  sendMultiPacket(buffer, sizeof(ProfileNamesSnapshot), static_cast<uint8_t>(McuCommsMessageType::MCUC_DATA_PROFILE_NAMES));
}

void McuComms::sendSelectProfile(uint8_t index) {
  if (!isConnected()) return;
  uint16_t messageSize = transfer.txObj(index);
  transfer.sendData(messageSize, static_cast<uint8_t>(McuCommsMessageType::MCUC_CMD_SELECT_PROFILE));
}

void McuComms::sendLogRecord(const LogSnapshot& snapshot) {
  if (!isConnected()) return;
  std::vector<uint8_t> buffer(sizeof(LogSnapshot));
  memcpy(buffer.data(), &snapshot, sizeof(LogSnapshot));
  sendMultiPacket(buffer, sizeof(LogSnapshot), static_cast<uint8_t>(McuCommsMessageType::MCUC_LOG_RECORD));
}

void McuComms::readDataAndTick() {
  uint8_t availableData = transfer.available();

  if (availableData > 0) {
    log("Some data is available\n");
    lastByteReceived = millis();
    switch (static_cast<McuCommsMessageType>(transfer.currentPacketID())) {
    case McuCommsMessageType::MCUC_HEARTBEAT: {
      break;
    } case McuCommsMessageType::MCUC_RESPONSE: {
      log("Received a response packet\n");
      McuCommsResponse response;
      transfer.rxObj(response);
      responseReceived(response);
      break;
    } case McuCommsMessageType::MCUC_DATA_SHOT_SNAPSHOT: {
      log("Received a shot snapshot packet\n");
      ShotSnapshot snapshot;
      transfer.rxObj(snapshot);
      shotSnapshotReceived(snapshot);
      break;
    } case McuCommsMessageType::MCUC_DATA_PROFILE: {
      log("Received a profile packet\n");
      vector<uint8_t> data = receiveMultiPacket();
      Profile profile;
      profileSerializer.deserializeProfile(data, profile);
      profileReceived(profile);
      break;
    } case McuCommsMessageType::MCUC_DATA_SENSOR_STATE_SNAPSHOT: {
      log("Received a sensor state snapshot packet\n");
      SensorStateSnapshot snapshot;
      transfer.rxObj(snapshot);
      sensorStateSnapshotReceived(snapshot);
      break;
    } case McuCommsMessageType::MCUC_DATA_REMOTE_SCALES_WEIGHT: {
      log("Received a weight packet\n");
      float weight = 0.f;
      transfer.rxObj(weight);
      remoteScalesWeightReceived(weight);
      break;
    } case McuCommsMessageType::MCUC_CMD_REMOTE_SCALES_TARE: {
      log("Received tare command");
      remoteScalesTareCommandReceived();
      break;
    } case McuCommsMessageType::MCUC_DATA_REMOTE_SCALES_DISCONNECTED: {
      log("Received scales disconnected message");
      remoteScalesDisconnected();
      break;
    } case McuCommsMessageType::MCUC_DATA_PROFILE_NAMES: {
      log("Received a profile names snapshot packet\n");
      std::vector<uint8_t> data = receiveMultiPacket();
      ProfileNamesSnapshot snapshot;
      memcpy(&snapshot, data.data(), sizeof(ProfileNamesSnapshot));
      profileNamesSnapshotReceived(snapshot);
      break;
    } case McuCommsMessageType::MCUC_CMD_SELECT_PROFILE: {
      log("Received a select profile command\n");
      uint8_t index = 0;
      transfer.rxObj(index);
      selectProfileCommandReceived(index);
      break;
    } case McuCommsMessageType::MCUC_LOG_RECORD: {
      log("Received a log record\n");
      std::vector<uint8_t> data = receiveMultiPacket();
      LogSnapshot snapshot;
      memcpy(&snapshot, data.data(), sizeof(LogSnapshot));
      logRecordReceived(snapshot);
      break;
    }
    default:
      log("WARN: Packet ID %d not handled\n", transfer.currentPacketID());
      break;
    }
  }

  if (millis() - lastHeartbeatSent > HEARTBEAT_TIME_DELTA_MSEC) {
    log("McuConnection[%s]: Sending heartbeat.\n", isConnected() ? "active" : "inactive");
    sendHeartbeat();
    lastHeartbeatSent = millis();
  }
}

/**
 * Connected when we have actually received at least one byte from the peer
 * AND it was within the last 3 heartbeat intervals. The lastByteReceived > 0
 * check matters because lastByteReceived is initialized to 0 - without this
 * guard, isConnected() returns true for the first ~6 seconds after boot even
 * before begin() has been called or any peer is wired up, which lets sendXxx
 * methods write to an uninitialized SerialTransfer underlying stream
 * (HardFault). Relevant the moment any code on the send side runs during
 * early boot - e.g. logs forwarded from log.cpp before espCommsInit().
 */
bool McuComms::isConnected() {
  return lastByteReceived > 0 && (millis() - lastByteReceived) < 3 * HEARTBEAT_TIME_DELTA_MSEC;
}
