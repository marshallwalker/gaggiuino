/* 09:32 15/03/2023 - change triggering comment */#ifndef SCALES_H
#define SCALES_H

// Needs to be here so it pleases so cppcheck is pleased.
#ifndef FORCE_PREDICTIVE_SCALES
#define FORCE_PREDICTIVE_SCALES 0
#endif

#include "measurements.h"

void scalesInit(float scalesF1, float scalesF2);
void scalesUpdateFactors(float scalesF1, float scalesF2);
void scalesTare(void);
Measurement scalesGetWeight(void);
bool scalesIsPresent(void);
float scalesDripTrayWeight();

// Calibration helpers — populate out[2] with the latest tared raw HX711 reading
// per cell, or read the live values directly. Returns false if hardware scales
// aren't present (out is left untouched).
bool scalesGetRawValues(long out[2]);
void scalesGetFactors(float* f1, float* f2);

#endif
