# Known Issues

Issues identified by code-quality audit but not yet fixed. Sorted by impact.
Items marked **verified** were spot-checked against the source; the rest are
audit findings that need confirmation before a fix.

Once an item ships, move it to the `## Changes in this fork` section of
[`README.md`](README.md) and remove it from this file.

---

## Tier 1 — Safety (boiler / pump / shot integrity)

### 1. `brewDetect` early-returns on water-tank-low mid-shot

- **Where:** `src/gaggiuino.ino:793-797` and `:835`
- **Problem:** When the user is on the Home page during a shot and `waterLvl` drops below `MIN_WATER_LVL`, `sysReadinessCheck` returns false, `brewDetect` exits without observing a brew-switch release, so `brewActive` stays true and `profiling()` keeps driving the pump and boiler.
- **Why it matters:** Pump runs dry, boiler keeps heating with no flow — exactly the scenario the water-tank guard is supposed to prevent.
- **Suggested fix:** Force `brewActive = false` (and ideally `setPumpOff` / open the valve) before the readiness early-return, or unconditionally read the brew-switch state first.

### 2. `getPumpFlowPerClick` divides by `pressure` with no zero guard ✅ verified

- **Where:** `src/peripherals/pump.cpp:113`
- **Problem:** `pressureInefficiencyCoefficient[5] / pressure` evaluates to ±inf when `pressure == 0` (idle / sensor zero-point). The `(inf + small) * (-pressure*pressure)` then evaluates to NaN.
- **Why it matters:** NaN propagates into `currentState.pumpFlow`, `smoothedPumpFlow`, `consideredFlow`, `shotWeight`, and the Kalman filter. Once a Kalman filter ingests NaN it stays NaN until reboot — predictive scales and stop-on-weight stop working silently.
- **Suggested fix:** `pressure = fmaxf(pressure, 0.05f);` at function entry.

### 3. `sysHealthCheck` pressure-release loop is unbounded

- **Where:** `src/gaggiuino.ino:897-921`
- **Problem:** `while (currentState.smoothedPressure >= pressureThreshold && currentState.temperature < 100.f)` has no max-iteration / wall-clock cap. Watchdog feeds keep the MCU alive but no other path executes.
- **Why it matters:** A stuck-high pressure sensor (failed ADS, broken wire pulled to a fixed reading) traps the firmware indefinitely. UI freezes, no fault popup fires, only forced-off pump and open valve.
- **Suggested fix:** Add a 30-second wall-clock timeout and bail out with a popup so the user sees the fault.

### 4. `predictive_weight::update` divides by `smoothedPumpFlow` with no guard

- **Where:** `src/functional/predictive_weight.h:52`
- **Problem:** `puckResistance = state.smoothedPressure * 1000.f / state.smoothedPumpFlow;` produces ±inf when `smoothedPumpFlow == 0` (idle, or before first flow update).
- **Why it matters:** Spurious inf in puck-resistance can flip the predictive-output-flow state machine — `outputFlowStarted` triggers early or never. Affects shot-stop-on-weight on profiles using predictive scales.
- **Suggested fix:** Guard with `state.smoothedPumpFlow > 0.05f`; otherwise return early or hold previous value.

---

## Tier 2 — Robustness & correctness

### 5. `(uint16_t)NaN` cast in `lcdRefresh` ✅ verified

- **Where:** `src/gaggiuino.ino:404` and `:410`
- **Problem:** When `currentState.temperature` is NaN, `(uint16_t)currentState.waterTemperature` is undefined behavior (float-to-int cast of NaN). Also `std::floor((uint16_t)x)` is nonsensical — floor of an integer is a no-op; the floor should wrap the float.
- **Why it matters:** Even though `modeSelect` and `sysHealthCheck` short-circuit heater control on NaN, `lcdRefresh` still runs and pushes UB-derived values to the display.
- **Suggested fix:** Early-out from the lcd update on `isnan(temperature)`; rewrite as `(uint16_t)std::floor(waterTemperature)`.

### 6. `OPMODE_steam` calls `steamCtrl` twice per loop on switch-off ✅ verified

- **Where:** `src/gaggiuino.ino:359` and `:363`
- **Problem:** `steamCtrl` is called unconditionally at line 359, then called again inside the `!steamSwitchState` branch at line 363.
- **Why it matters:** `steamCtrl` mutates `currentState.isSteamForgottenON` based on `millis() - steamTime`; back-to-back calls in the same iteration churn that state and double-toggle relays for no reason.
- **Suggested fix:** Drop the second `steamCtrl(runningCfg, currentState);` call at line 363.

### 7. `PhaseProfiler::updatePhase` indexes past bounds when no phases exist

- **Where:** `lib/Common/profiling_phases.cpp:125-128`
- **Problem:** When `phaseIdx >= profile.phaseCount()`, the function still calls `currentPhase.update(currentPhaseIdx - 1, profile.phases[phaseIdx], timeInPhase)`. Both `phases[phaseIdx]` and (when `phaseCount() == 0`) the size_t underflow `currentPhaseIdx - 1` are out of range.
- **Why it matters:** Vector OOB on STM32 returns whatever lies past the heap bucket; ends up storing a dangling pointer in `currentPhase`. Subsequent `getCurrentPhase()` calls dereference it.
- **Suggested fix:** Use `phases[phaseIdx - 1]` when entering the finished branch, and clamp `phaseCount() - 1` to 0 when phaseCount is 0.

### 8. ADS bus-clear runs unthrottled when sensor is errored

- **Where:** `src/peripherals/pressure_sensor.cpp:38-41` and `src/peripherals/i2c_bus_reset.h:37-63`
- **Problem:** The 500 ms throttle is bypassed when `ADS.getError() != 0`, so a persistently broken pressure sensor calls `i2cResetState` every 10 ms loop iteration. `I2C_ClearBus` can block up to ~40 s in the worst-case slave-stretch path.
- **Why it matters:** The README's existing throttle fix covers normal-path probing, but a real I²C failure (e.g. sensor unplugged at runtime) still produces multi-second loop stalls. Watchdog keeps it alive but UI/heater control freezes.
- **Suggested fix:** Apply the same 500 ms throttle to the error path, or limit `I2C_ClearBus` to one short attempt and surface a popup if recovery fails.

### 9. `tof_sensor.readLvl()` runs after init timed out

- **Where:** `src/peripherals/tof.h:39-47`
- **Problem:** When the bounded-init `while` loop exits via `return;` on timeout, it correctly skips `startRangeContinuous()` — but `mvAvg.begin()` and timer setup are also skipped. `readLvl()` then still calls `tof_sensor.isRangeComplete()` on an uninitialized driver object.
- **Why it matters:** Calling library methods on an uninitialized VL53L0X driver is implementation-defined; on the Adafruit driver it pokes I²C with a stale address and may stall the hot path until ack timeout.
- **Suggested fix:** Guard `readLvl()` entry with `if (!tofReady) return <default>;`.

---

## Tier 3 — Code hygiene / minor

### 10. LED disco switch fall-through ✅ verified

- **Where:** `src/peripherals/led.h:67-92`
- **Problem:** `LED::CLASSIC` and `LED::DESCALE` switch cases lack `break;` and fall through into `LED::STROBE`'s body on every call.
- **Why it matters:** Brew-time disco and descale slow-fade modes are corrupted by overlapping white strobe writes; the LED appears to flash white instead of the intended color sequence.
- **Suggested fix:** Add `break;` after each case body.

### 11. `lcdShowPopup` throttle uses wrap-vulnerable addition

- **Where:** `src/lcd/nextion.cpp:551`
- **Problem:** `if(millis() > timer + 1150)` — `timer + 1150` overflows when `timer` is near `UINT32_MAX`, causing the comparison to permanently fail until `millis()` rolls over and lines back up.
- **Why it matters:** ~49.7-day uptime rollover causes a brief popup blackout window. Cosmetic but inconsistent with the `now - timer >= delta` pattern used everywhere else.
- **Suggested fix:** Replace with `if (millis() - timer >= 1150u)`.

### 12. `sensorsReadFlow` stores clicks-per-second into a `long pumpClicks` field

- **Where:** `src/gaggiuino.ino:215` and `lib/Common/sensors_state.h:28`
- **Problem:** Line 215 assigns a float (`pumpClicks / elapsedTimeSec`, in clicks per second) into `currentState.pumpClicks` declared as `long`. Truncation hides intent, and the field name implies raw count.
- **Why it matters:** Reading callers (e.g. `predictive_weight.h:55` which subtracts `state.pumpClicks` from a pressure-scaled term) may expect different units. Subtle correctness drift, hard to spot.
- **Suggested fix:** Either rename to `pumpClicksPerSec` and change type to `float`, or keep raw count and rate as separate fields.
