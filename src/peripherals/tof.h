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
    uint16_t readLvl();
    uint16_t readRangeToPct(uint16_t val);

  private:
    // HardwareTimer* hw_timer;
    // static void TimerHandler10(void);
    uint32_t tofReading;
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

uint16_t TOF::readLvl() {
  #ifdef TOF_VL53L0X
  if(tof_sensor.isRangeComplete()) {
    TOF::tofReading = mvAvg.reading(tof_sensor.readRangeResult());
  }
  #endif
  return  TOF::tofReading != 0 ? readRangeToPct(TOF::tofReading) : 30u;
}

uint16_t TOF::readRangeToPct(uint16_t val) {
  static const std::array<uint16_t, 10> water_lvl = { 100u, 90u, 80u, 70u, 60u, 50u, 40u, 30u, 20u, 10u };
  static const std::array<uint16_t, 9> ranges = { 15u, 30u, 45u, 60u, 75u, 90u, 105u, 115u, 125u };
  for (size_t i = 0; i < ranges.size(); i++) {
    if (val <= ranges[i]) {
      return water_lvl[i];
    }
  }

  return 9u;
}

#endif
