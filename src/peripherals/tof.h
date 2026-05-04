#ifndef TOF_H
#define TOF_H

#include <stdint.h> // for uint8_t
#include <Adafruit_VL53L0X.h>
#include <movingAvg.h>
#include "../../lib/Common/sensors_state.h"

Adafruit_VL53L0X tof_sensor;
movingAvg mvAvg(4);

class TOF {
  public:
    TOF();
    void init(SensorState& sensor);
    void tick();  // pump sensor + moving avg if a new sample is ready
    uint16_t readLvl(uint16_t rangeFull, uint16_t rangeEmpty);
    uint16_t getRawReading() const { return static_cast<uint16_t>(tofReading); }
    static uint16_t rangeToPct(uint16_t val, uint16_t rangeFull, uint16_t rangeEmpty);

  private:
    uint32_t tofReading = 0;
};

TOF::TOF() {}

// void TOF::TimerHandler10() {
//   if (instance != nullptr && tof_sensor.isRangeComplete()) {
//     TOF::tofReading = tof_sensor.readRangeResult();
//   }
// }

void TOF::init(SensorState& sensor) {
  #ifdef TOF_VL53L0X
  // Bounded retry so a missing or dead VL53L0X can't hang boot indefinitely
  // (this runs before iwdcInit so there is no watchdog recovery yet).
  // Without the sensor, readLvl() falls through to a safe default value.
  const unsigned long deadline = millis() + 2000ul;
  while (!sensor.tofReady) {
    sensor.tofReady = tof_sensor.begin(0x29, false, &Wire, Adafruit_VL53L0X::VL53L0X_SENSE_HIGH_ACCURACY);
    if (sensor.tofReady) break;
    if (millis() > deadline) {
      return;
    }
    delay(20);
  }
  tof_sensor.startRangeContinuous();
  mvAvg.begin();
  // Configure the hardware timer
  // hw_timer = new HardwareTimer(TIM10);
  // hw_timer->setCount(100000, MICROSEC_FORMAT);
  // hw_timer->setOverflow(100000, MICROSEC_FORMAT);
  // hw_timer->setInterruptPriority(1, 1);
  // hw_timer->attachInterrupt(TOF::TimerHandler10); // Attach the ISR function to the timer

  #endif
}

void TOF::tick() {
  #ifdef TOF_VL53L0X
  if (tof_sensor.isRangeComplete()) {
    TOF::tofReading = mvAvg.reading(tof_sensor.readRangeResult());
  }
  #endif
}

uint16_t TOF::readLvl(uint16_t rangeFull, uint16_t rangeEmpty) {
  tick();
  return TOF::tofReading != 0 ? rangeToPct(static_cast<uint16_t>(TOF::tofReading), rangeFull, rangeEmpty) : 30u;
}

// Linear interpolation between the two calibrated endpoints. val is the raw
// distance the ToF sensor is reporting (mm). rangeFull is the distance when
// the tank is full (sensor close to water surface), rangeEmpty is the distance
// when the tank is empty (sensor sees the bottom).
uint16_t TOF::rangeToPct(uint16_t val, uint16_t rangeFull, uint16_t rangeEmpty) {
  if (rangeEmpty <= rangeFull) {
    return 0u; // misconfigured calibration; defaults guarantee this can't happen
  }
  if (val <= rangeFull) return 100u;
  if (val >= rangeEmpty) return 0u;
  const uint32_t span = static_cast<uint32_t>(rangeEmpty - rangeFull);
  const uint32_t fromEmpty = static_cast<uint32_t>(rangeEmpty - val);
  return static_cast<uint16_t>((fromEmpty * 100u) / span);
}

#endif
