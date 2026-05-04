#ifndef STM_COMMS_H
#define STM_COMMS_H

#include "mcu_comms.h"

void stmCommsInit(HardwareSerial& serial);
void stmCommsReadData();
void stmCommsSendWeight(float weight);
void stmCommsSendScaleDisconnected();
void stmCommsSendSelectProfile(uint8_t index);
void stmCommsSendCalibrateTof(TofCalibrationTarget target);

bool stmCommsHasProfileNames();
const ProfileNamesSnapshot& stmCommsGetCachedProfileNames();

// To be defined elsewhere
void onSensorStateSnapshotReceived(SensorStateSnapshot& snapshot);
void onShotSnapshotReceived(ShotSnapshot& snapshot);
void onScalesTareReceived();
void onProfileNamesSnapshotReceived(ProfileNamesSnapshot& snapshot);
void onLogRecordReceived(LogSnapshot& snapshot);

#endif
