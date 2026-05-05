/* 09:32 15/03/2023 - change triggering comment */
#include "scales.h"
#include "pindef.h"
#include "remote_scales.h"
#include "../log.h"

#include <HX711_2.h>
namespace {
  class LoadCellSingleton {
  public:
    static HX711_2& getInstance() {
      static HX711_2 instance(TIM3);
      return instance;
    }
  private:
    LoadCellSingleton() = default;
    ~LoadCellSingleton() = default;
  };
}

bool hwScalesPresent = false;
// Cache of the persisted calibration factors so the calibration UI can read
// them back without a round trip through EEPROM.
static float currentScalesF1 = 1.f;
static float currentScalesF2 = 1.f;
// Cache of the last raw (offset-subtracted) reading per cell, populated each
// time scalesGetWeight runs so scalesGetRawValues can return without another
// HX711 conversion.
static long lastRawCell1 = 0;
static long lastRawCell2 = 0;

#if defined SINGLE_HX711_BOARD
unsigned char scale_clk = OUTPUT;
#else
unsigned char scale_clk = OUTPUT_OPEN_DRAIN;
#endif

void scalesInit(float scalesF1, float scalesF2) {
  hwScalesPresent = false;
  currentScalesF1 = scalesF1;
  currentScalesF2 = scalesF2;
  // Forced predicitve scales in case someone with actual hardware scales wants to use them.
  if (FORCE_PREDICTIVE_SCALES) {
    LOG_INFO("Scales: forced predictive mode (FORCE_PREDICTIVE_SCALES=1)");
    return;
  }

#ifndef DISABLE_HW_SCALES
  auto& loadCells = LoadCellSingleton::getInstance();
  loadCells.begin(HX711_dout_1, HX711_dout_2, HX711_sck_1, 128U, scale_clk);
  loadCells.set_scale(scalesF1, scalesF2);
  loadCells.power_up();

  if (loadCells.wait_ready_timeout(1000, 10)) {
    loadCells.tare(4);
    hwScalesPresent = true;
    LOG_INFO("Scales: HX711 detected (factors f1=%.2f f2=%.2f)", (double)scalesF1, (double)scalesF2);
  }
  else {
    loadCells.power_down();
    LOG_ERROR("Scales: HX711 did not respond within 1s — falling back to predictive scales");
  }
#else
  LOG_INFO("Scales: hardware disabled at compile time (DISABLE_HW_SCALES)");
#endif

  if (!hwScalesPresent && remoteScalesIsPresent()) {
    remoteScalesTare();
  }
}

void scalesUpdateFactors(float scalesF1, float scalesF2) {
  currentScalesF1 = scalesF1;
  currentScalesF2 = scalesF2;
  if (hwScalesPresent) {
    LoadCellSingleton::getInstance().set_scale(scalesF1, scalesF2);
  }
}

void scalesTare(void) {
  if (hwScalesPresent) {
    auto& loadCells = LoadCellSingleton::getInstance();
    if (loadCells.wait_ready_timeout(150, 10)) {
      loadCells.tare(4);
    }
  }
  else if (remoteScalesIsPresent()) {
    remoteScalesTare();
  }
}

Measurement scalesGetWeight(void) {
  Measurement currentWeight = Measurement{ .value = 0.f, .millis = 0 };
  if (hwScalesPresent) {
    auto& loadCells = LoadCellSingleton::getInstance();
    if (loadCells.wait_ready_timeout(150, 10)) {
      float values[2];
      loadCells.get_units(values);
      currentWeight = Measurement{ .value=values[0] + values[1], .millis=millis() };
      // get_units performs a read_average internally and subtracts the offset
      // to produce a tared raw value, then divides by the scale factor. We
      // back out the tared raw by multiplying values back up so the
      // calibration UI sees the same numbers the conversion is using. Avoids
      // a second HX711 read on every snapshot tick.
      lastRawCell1 = (long)(values[0] * currentScalesF1);
      lastRawCell2 = (long)(values[1] * currentScalesF2);
    }
  }
  else if (remoteScalesIsPresent()) {
    currentWeight = remoteScalesGetWeight();
  }
  return currentWeight;
}

bool scalesIsPresent(void) {
  // Forced predicitve scales in case someone with actual hardware scales wants to use them.
  if (FORCE_PREDICTIVE_SCALES) {
    return false;
  }
  return hwScalesPresent || remoteScalesIsPresent();
}

float scalesDripTrayWeight() {
  long value[2] = {};
  if (hwScalesPresent) {
    LoadCellSingleton::getInstance().read_average(value, 4);
  }
  return ((float)value[0] + (float)value[1]);
}

bool scalesGetRawValues(long out[2]) {
  if (!hwScalesPresent) return false;
  out[0] = lastRawCell1;
  out[1] = lastRawCell2;
  return true;
}

void scalesGetFactors(float* f1, float* f2) {
  if (f1) *f1 = currentScalesF1;
  if (f2) *f2 = currentScalesF2;
}
