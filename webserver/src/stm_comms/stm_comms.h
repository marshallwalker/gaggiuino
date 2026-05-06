#ifndef STM_COMMS_H
#define STM_COMMS_H

#include "mcu_comms.h"

void stmCommsInit(HardwareSerial& serial);
void stmCommsReadData();
void stmCommsSendWeight(float weight);
void stmCommsSendScaleDisconnected();
void stmCommsSendSelectProfile(uint8_t index);
void stmCommsSendCalibrateTof(TofCalibrationTarget target);
void stmCommsSendScalesTare();
void stmCommsSendScalesSetFactors(float factor1, float factor2);
void stmCommsSendRequestProfileNames();
void stmCommsSendRequestProfileData(uint8_t index);
void stmCommsSendProfileDataSet(const ProfileDataSnapshot& snapshot);

bool stmCommsHasProfileNames();
const ProfileNamesSnapshot& stmCommsGetCachedProfileNames();
bool stmCommsHasScalesSnapshot();
const ScalesSnapshot& stmCommsGetCachedScalesSnapshot();
bool stmCommsHasProfileData(uint8_t index);
const ProfileDataSnapshot& stmCommsGetCachedProfileData(uint8_t index);
// Clears the cache flag for one slot so the next stmCommsHasProfileData()
// returns false until the STM pushes a fresh snapshot. Used by the PUT
// handler to wait for write-confirmation without a separate response message.
// Also re-arms the walker so it issues a fresh request next tick.
void stmCommsInvalidateProfileDataCache(uint8_t index);
// Same idea for the names list — used by the GET handler on a cold-boot
// cache miss so the walker re-fetches without piling on a duplicate request.
void stmCommsInvalidateProfileNamesCache();

// To be defined elsewhere
void onSensorStateSnapshotReceived(SensorStateSnapshot& snapshot);
void onShotSnapshotReceived(ShotSnapshot& snapshot);
void onScalesTareReceived();
void onScalesSnapshotReceived(ScalesSnapshot& snapshot);
void onProfileNamesSnapshotReceived(ProfileNamesSnapshot& snapshot);
void onProfileDataSnapshotReceived(ProfileDataSnapshot& snapshot);
void onLogRecordReceived(LogSnapshot& snapshot);

#endif
