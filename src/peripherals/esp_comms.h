/* 09:32 15/03/2023 - change triggering comment */
#ifndef ESP_COMMS_H
#define ESP_COMMS_H

#include "mcu_comms.h"
#include "../eeprom_data/eeprom_data.h"

void espCommsInit();
bool espCommsIsConnected();

void espCommsReadData();

void espCommsSendSensorData(const SensorState& state, uint32_t frequency = 1000);
void espCommsSendShotData(ShotSnapshot& shotData, uint32_t frequency = 100);
void espCommsSendTareScalesCommand();
void espCommsSendProfileNames(const eepromValues_t& cfg);
void espCommsSendLog(const char* message);
void espCommsSendScalesSnapshot(const ScalesSnapshot& snapshot, uint32_t frequency = 250);
void espCommsSendProfileData(const eepromValues_t& cfg, uint8_t index);

void onProfileReceived(Profile& profile);
void onRemoteScalesWeightReceived(float weight);
void onRemoteScalesDisconnected();
void onSelectProfileReceived(uint8_t index);
void onCalibrateTofReceived(TofCalibrationTarget target);
void onScalesTareReceived();
void onScalesSetFactorsReceived(ScalesFactors factors);
void onRequestProfileNamesReceived();
void onRequestProfileDataReceived(uint8_t index);

#endif
