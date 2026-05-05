#ifndef MCU_COMMS_H
/* 09:32 15/03/2023 - change triggering comment */
#define MCU_COMMS_H

#include <Arduino.h>
#include "profiling_phases.h"
#include "SerialTransfer.h"
#include <vector>
#include <functional>

#ifdef ESP32
#include "esp_task_wdt.h"
#endif

const uint8_t MAX_DATA_PER_PACKET_DEFAULT = 58;
const uint16_t HEARTBEAT_TIME_DELTA_MSEC = 2000;

enum class McuCommsMessageType : uint8_t {
  MCUC_HEARTBEAT = 1,

  MCUC_DATA_SHOT_SNAPSHOT = 2,
  MCUC_DATA_PROFILE = 3,
  MCUC_DATA_SENSOR_STATE_SNAPSHOT = 4,
  MCUC_DATA_REMOTE_SCALES_WEIGHT = 5,
  MCUC_DATA_REMOTE_SCALES_DISCONNECTED = 6,

  // Request specific data
  MCUC_REQ_ACTIVE_PROFILE = 7,
  MCUC_REQ_SETTINGS = 8,

  // Commands
  MCUC_CMD_SAVE_PROFILE = 9,
  MCUC_CMD_SAVE_SETTINGS = 10,
  MCUC_CMD_REMOTE_SCALES_TARE = 11,

  MCUC_RESPONSE = 12,

  MCUC_DATA_PROFILE_NAMES = 13,    // STM -> ESP: all 5 profile names
  MCUC_CMD_SELECT_PROFILE = 14,    // ESP -> STM: switch active profile (1-indexed)
  MCUC_LOG_RECORD = 15,            // STM -> ESP: pre-formatted log line
  MCUC_CMD_CALIBRATE_TOF = 16,     // ESP -> STM: calibrate ToF endpoint (payload: TofCalibrationTarget)

  MCUC_DATA_SCALES_SNAPSHOT = 17,  // STM -> ESP: scales calibration snapshot (raw + factors + weight)
  MCUC_CMD_SCALES_TARE = 18,       // ESP -> STM: zero the load cells (web-initiated, distinct from remote-scales tare)
  MCUC_CMD_SCALES_SET_FACTORS = 19,// ESP -> STM: set + persist new calibration factors {f1, f2}

  MCUC_REQ_PROFILE_NAMES = 20,     // ESP -> STM: ask STM to push the current profile names (response arrives as MCUC_DATA_PROFILE_NAMES)

  MCUC_REQ_PROFILE_DATA = 21,      // ESP -> STM: ask STM for one profile's basic settings (payload: 1-indexed uint8_t)
  MCUC_DATA_PROFILE_DATA = 22,     // STM -> ESP: ProfileDataSnapshot for one profile
  MCUC_CMD_PROFILE_DATA_SET = 23,  // ESP -> STM: write a profile slot (payload: ProfileDataSnapshot)
};

enum class TofCalibrationTarget : uint8_t {
  TOF_CALIBRATE_FULL = 1,
  TOF_CALIBRATE_EMPTY = 2,
};

// Live snapshot of the load-cell state, sent from STM to ESP at low frequency
// (~4 Hz) so the web UI can render raw counts per cell, the converted weight,
// and the persisted calibration factors during scale calibration.
struct ScalesSnapshot {
  bool present;        // hardware scales connected
  long raw1;           // raw HX711 reading, cell 1 (after offset/tare subtraction)
  long raw2;           // raw HX711 reading, cell 2
  float weight;        // converted total weight in grams (raw / factor, summed)
  float factor1;       // current cell-1 calibration factor
  float factor2;       // current cell-2 calibration factor
};

// Payload for MCUC_CMD_SCALES_SET_FACTORS — both cells set together so the
// STM can persist atomically.
struct ScalesFactors {
  float factor1;
  float factor2;
};

// Full mirror of the EEPROM profile_t struct (minus the surrounding global
// settings) plus an `index` field. Sent both directions:
//   - STM → ESP: response to MCUC_REQ_PROFILE_DATA, populates the editor
//   - ESP → STM: MCUC_CMD_PROFILE_DATA_SET, writes a new profile to EEPROM
// Slope-shape fields (preinfusionRampSlope, *SlopeShape) are TransitionCurve
// enum values: 0=EASE_IN_OUT, 1=EASE_IN, 2=EASE_OUT, 3=LINEAR, 4=INSTANT.
#define PROFILE_DATA_NAME_LENGTH 25
struct ProfileDataSnapshot {
  uint8_t  index;                  // 1-indexed; 0 means "not populated / lookup failed"
  char     name[PROFILE_DATA_NAME_LENGTH];
  // Preinfusion
  bool     preinfusionState;
  bool     preinfusionFlowState;   // false = pressure-controlled, true = flow
  uint16_t preinfusionSec;
  float    preinfusionBar;
  float    preinfusionFlowVol;
  uint16_t preinfusionFlowTime;
  float    preinfusionFlowPressureTarget;
  float    preinfusionPressureFlowTarget;
  float    preinfusionFilled;
  bool     preinfusionPressureAbove;
  float    preinfusionWeightAbove;
  // Soak
  bool     soakState;
  uint16_t soakTimePressure;
  uint16_t soakTimeFlow;
  float    soakKeepPressure;
  float    soakKeepFlow;
  float    soakBelowPressure;
  float    soakAbovePressure;
  float    soakAboveWeight;
  // Preinfusion → profiling ramp
  uint16_t preinfusionRamp;
  uint16_t preinfusionRampSlope;
  // Profiling: transition phase (pressure-side)
  bool     tpState;
  bool     tpType;
  float    tpProfilingStart;
  float    tpProfilingFinish;
  uint16_t tpProfilingHold;
  float    tpProfilingHoldLimit;
  uint16_t tpProfilingSlope;
  uint16_t tpProfilingSlopeShape;
  float    tpProfilingFlowRestriction;
  // Profiling: transition phase (flow-side)
  float    tfProfileStart;
  float    tfProfileEnd;
  uint16_t tfProfileHold;
  float    tfProfileHoldLimit;
  uint16_t tfProfileSlope;
  uint16_t tfProfileSlopeShape;
  float    tfProfilingPressureRestriction;
  // Profiling: main phase
  bool     profilingState;
  bool     mfProfileState;
  float    mpProfilingStart;
  float    mpProfilingFinish;
  uint16_t mpProfilingSlope;
  uint16_t mpProfilingSlopeShape;
  float    mpProfilingFlowRestriction;
  float    mfProfileStart;
  float    mfProfileEnd;
  uint16_t mfProfileSlope;
  uint16_t mfProfileSlopeShape;
  float    mfProfilingPressureRestriction;
  // Other
  uint16_t setpoint;               // brew temp °C
  bool     stopOnWeightState;
  float    shotDose;               // input dose in grams
  float    shotStopOnCustomWeight; // explicit target weight when >= 1g
  uint16_t shotPreset;             // multiplier (1=single, 2=double, ...) used when shotStopOnCustomWeight < 1
};

#define LOG_RECORD_LEN 128
struct LogSnapshot {
  char message[LOG_RECORD_LEN];
};

enum class McuCommsResponseResult : uint8_t {
  MCUC_OK = 0,
  MCUC_ERROR = 1,
};

struct McuCommsResponse {
  McuCommsMessageType type;
  McuCommsResponseResult result;
};

class ProfileSerializer {
public:
  size_t neededBufferSize(Profile& profile) const;
  std::vector<uint8_t> serializeProfile(Profile& profile) const;
  void deserializeProfile(std::vector<uint8_t>& data, Profile& profile) const;
};

class McuComms {
private:
  using ShotSnapshotReceivedCallback = std::function<void(ShotSnapshot&)>;
  using ProfileReceivedCallback = std::function<void(Profile&)>;
  using SensorStateSnapshotReceivedCallback = std::function<void(SensorStateSnapshot&)>;
  using ResponseReceivedCallback = std::function<void(McuCommsResponse&)>;
  using RemoteScalesWeightReceivedCallback = std::function<void(float)>;
  using RemoteScalesTareCommandCallback = std::function<void()>;
  using RemoteScalesDisconnectedCallback = std::function<void()>;
  using ProfileNamesSnapshotReceivedCallback = std::function<void(ProfileNamesSnapshot&)>;
  using SelectProfileCommandCallback = std::function<void(uint8_t)>;
  using LogRecordReceivedCallback = std::function<void(LogSnapshot&)>;
  using CalibrateTofCommandCallback = std::function<void(TofCalibrationTarget)>;
  using ScalesSnapshotReceivedCallback = std::function<void(ScalesSnapshot&)>;
  using ScalesTareCommandCallback = std::function<void()>;
  using ScalesSetFactorsCommandCallback = std::function<void(ScalesFactors)>;
  using RequestProfileNamesCallback = std::function<void()>;
  using RequestProfileDataCallback = std::function<void(uint8_t)>;
  using ProfileDataSnapshotReceivedCallback = std::function<void(ProfileDataSnapshot&)>;
  using SetProfileDataCommandCallback = std::function<void(ProfileDataSnapshot&)>;

  uint32_t lastByteReceived = 0;
  uint32_t lastHeartbeatSent = 0;
  ProfileSerializer profileSerializer;
  SerialTransfer transfer;
  ShotSnapshotReceivedCallback shotSnapshotCallback = nullptr;
  ProfileReceivedCallback profileCallback = nullptr;
  SensorStateSnapshotReceivedCallback sensorStateSnapshotCallback = nullptr;
  ResponseReceivedCallback responseReceivedCallback = nullptr;
  RemoteScalesWeightReceivedCallback remoteScalesWeightReceivedCallback = nullptr;
  RemoteScalesTareCommandCallback remoteScalesTareCommandCallback = nullptr;
  RemoteScalesDisconnectedCallback remoteScalesDisconnectedCallback = nullptr;
  ProfileNamesSnapshotReceivedCallback profileNamesSnapshotCallback = nullptr;
  SelectProfileCommandCallback selectProfileCommandCallback = nullptr;
  LogRecordReceivedCallback logRecordCallback = nullptr;
  CalibrateTofCommandCallback calibrateTofCommandCallback = nullptr;
  ScalesSnapshotReceivedCallback scalesSnapshotCallback = nullptr;
  ScalesTareCommandCallback scalesTareCommandCallback = nullptr;
  ScalesSetFactorsCommandCallback scalesSetFactorsCommandCallback = nullptr;
  RequestProfileNamesCallback requestProfileNamesCallback = nullptr;
  RequestProfileDataCallback requestProfileDataCallback = nullptr;
  ProfileDataSnapshotReceivedCallback profileDataSnapshotCallback = nullptr;
  SetProfileDataCommandCallback setProfileDataCommandCallback = nullptr;
  Stream* debugPort = nullptr;
  size_t packetSize;

  /**
  * Structure inside each packet. We are adding the current packet sequence number and last packet sequence
  * number which greatly help in serialisation/deserialisation of large payloads
  *
  *   0x02     0x01     0x00     0x00   ....
  * |      | |      | |      | |______|__________________________________________ 2nd packet byte
  * |      | |      | |______|___________________________________________________ 1st packet byte
  * |      | |______|____________________________________________________________ index of current packet
  * |______|_____________________________________________________________________ index of last packet
  */
  void sendMultiPacket(std::vector<uint8_t>& buffer, size_t dataSize, uint8_t packetID);
  std::vector<uint8_t> receiveMultiPacket();
  void log(const char* format, ...) const;
  void logBufferHex(std::vector<uint8_t>& buffer, size_t dataSize) const;
  void establishConnection(uint32_t timeout);
  void sendHeartbeat();

  void shotSnapshotReceived(ShotSnapshot& snapshot) const;
  void profileReceived(Profile& profile) const;
  void sensorStateSnapshotReceived(SensorStateSnapshot& snapshot) const;
  void responseReceived(McuCommsResponse& response) const;
  void remoteScalesWeightReceived(float weight) const;
  void remoteScalesTareCommandReceived() const;
  void remoteScalesDisconnected() const;
  void profileNamesSnapshotReceived(ProfileNamesSnapshot& snapshot) const;
  void selectProfileCommandReceived(uint8_t index) const;
  void logRecordReceived(LogSnapshot& snapshot) const;
  void calibrateTofCommandReceived(TofCalibrationTarget target) const;
  void scalesSnapshotReceived(ScalesSnapshot& snapshot) const;
  void scalesTareCommandReceived() const;
  void scalesSetFactorsCommandReceived(ScalesFactors factors) const;
  void requestProfileNamesReceived() const;
  void requestProfileDataReceived(uint8_t index) const;
  void profileDataSnapshotReceived(ProfileDataSnapshot& snapshot) const;
  void setProfileDataCommandReceived(ProfileDataSnapshot& snapshot) const;

public:
  void begin(Stream& serial, uint32_t waitConnectionMillis = 0, size_t packetSize = MAX_DATA_PER_PACKET_DEFAULT);
  void setDebugPort(Stream* debugPort);
  void setShotSnapshotCallback(ShotSnapshotReceivedCallback callback);
  void setProfileReceivedCallback(ProfileReceivedCallback callback);
  void setSensorStateSnapshotCallback(SensorStateSnapshotReceivedCallback callback);
  void setResponseReceivedCallback(ResponseReceivedCallback callback);
  void setRemoteScalesWeightReceivedCallback(RemoteScalesWeightReceivedCallback callback);
  void setRemoteScalesTareCommandCallback(RemoteScalesTareCommandCallback callback);
  void setRemoteScalesDisconnectedCallback(RemoteScalesDisconnectedCallback callback);
  void setProfileNamesSnapshotCallback(ProfileNamesSnapshotReceivedCallback callback);
  void setSelectProfileCommandCallback(SelectProfileCommandCallback callback);
  void setLogRecordReceivedCallback(LogRecordReceivedCallback callback);
  void setCalibrateTofCommandCallback(CalibrateTofCommandCallback callback);
  void setScalesSnapshotReceivedCallback(ScalesSnapshotReceivedCallback callback);
  void setScalesTareCommandCallback(ScalesTareCommandCallback callback);
  void setScalesSetFactorsCommandCallback(ScalesSetFactorsCommandCallback callback);
  void setRequestProfileNamesCallback(RequestProfileNamesCallback callback);
  void setRequestProfileDataCallback(RequestProfileDataCallback callback);
  void setProfileDataSnapshotReceivedCallback(ProfileDataSnapshotReceivedCallback callback);
  void setSetProfileDataCommandCallback(SetProfileDataCommandCallback callback);

  void sendShotData(const ShotSnapshot& snapshot);
  void sendProfile(Profile& profile);
  void sendSensorStateSnapshot(const SensorStateSnapshot& snapshot);
  void sendResponse(McuCommsResponse response);
  void sendRemoteScalesWeight(float weight);
  void sendRemoteScalesTare();
  void sendRemoteScalesDisconnected();
  void sendProfileNamesSnapshot(const ProfileNamesSnapshot& snapshot);
  void sendSelectProfile(uint8_t index);
  void sendLogRecord(const LogSnapshot& snapshot);
  void sendCalibrateTof(TofCalibrationTarget target);
  void sendScalesSnapshot(const ScalesSnapshot& snapshot);
  void sendScalesTare();
  void sendScalesSetFactors(ScalesFactors factors);
  void sendRequestProfileNames();
  void sendRequestProfileData(uint8_t index);
  void sendProfileDataSnapshot(const ProfileDataSnapshot& snapshot);
  void sendProfileDataSet(const ProfileDataSnapshot& snapshot);

  bool isConnected();
  void readDataAndTick();
};


#endif
