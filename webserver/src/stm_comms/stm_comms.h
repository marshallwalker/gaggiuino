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

bool stmCommsHasProfileNames();
const ProfileNamesSnapshot& stmCommsGetCachedProfileNames();
bool stmCommsHasScalesSnapshot();
const ScalesSnapshot& stmCommsGetCachedScalesSnapshot();

// To be defined elsewhere
void onSensorStateSnapshotReceived(SensorStateSnapshot& snapshot);
void onShotSnapshotReceived(ShotSnapshot& snapshot);
void onScalesTareReceived();
void onScalesSnapshotReceived(ScalesSnapshot& snapshot);
void onProfileNamesSnapshotReceived(ProfileNamesSnapshot& snapshot);
void onLogRecordReceived(LogSnapshot& snapshot);

#endif
