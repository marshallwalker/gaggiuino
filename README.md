<div align="center">

[![Gaggiuino](/images/GAGGIUINO_LOGO_transp.png)](https://gaggiuino.github.io/#/)
  
[![Compile Sketch](https://github.com/Zer0-bit/gaggiuino/actions/workflows/compile-sketch.yml/badge.svg)](https://github.com/Zer0-bit/gaggiuino/actions/workflows/compile-sketch.yml)
[![Discord Chat](https://img.shields.io/discord/890339612441063494)](https://discord.gg/eJTDJA3xfh "Join Discord Help Chat")
</div>

***

## About this fork

This is my own personal fork of Gaggiuino. I'm just a guy who likes to code and who likes coffee. I tinker with it for my own machine — a Gaggia Classic Pro 2019 — and push changes as I find time.

**Use at your own risk.** I don't accept any liability for anyone who voluntarily uses this code, builds from it, or flashes it to their hardware. There are no warranties, express or implied. If something goes wrong — boiler runaway, blown fuse, bricked controller, ruined espresso — that's on you. Read the diff before you flash. If you're not comfortable doing that, stick with the upstream releases.

Issues and pull requests are welcome, but no guarantee they'll be implemented — this is a personal workspace and I work on it when I feel like it.

> **Note:** firmware changes are STM32-side and don't require re-flashing the LCD. There is one HMI change in this fork — the steam-mode temperature progress-bar math — documented in [`lcd-hmi/home-tm0-steam-progress-fix.md`](lcd-hmi/home-tm0-steam-progress-fix.md). The compiled `nextion-lcd.tft` and `tjc-basic-lcd.tft` in this repo already include the fix; if you'd rather rebuild from source, edit the `.HMI` in Nextion Editor and (for TJC hardware) run [`scripts/convert-to-tjc.ps1`](scripts/convert-to-tjc.ps1) to generate the TJC variant. The firmware-only fixes still work without re-flashing the LCD if you'd prefer to skip it.

## Changes in this fork

Functional fixes:

- Scale calibration factors apply live on save — no reboot required
- Pump init (`pumpFlowAtZero`, `powerLineFrequency`) re-runs on save so flow calibration takes effect immediately
- All saved settings are mirrored into the running config on save (steam setpoint, offsetTemp, hpwr, dividers, etc.) — no reboot required for any tunable
- Steam temperature comparison cleaned up — was redundantly applying `offsetTemp` to both sides of the cutoff
- Hot-water mode no longer briefly pulses the boiler on before the temperature guard runs
- Brew+steam combined "hot-water" shortcut is now restricted to the Home page so a stray switch bump mid-shot or mid-steam can't divert into hot-water mode
- Post-shot pressure-release countdown popup renamed from "Dropping beats" to "Pressure release in: Ns"
- Weight display below 0.1 g clamps to 0.0 g — suppresses HX711 noise-floor flicker (`-0.1 / -0.0 / 0.0 / 0.1` jitter at rest). Raw `currentState.weight` is unchanged, so flow-rate, auto-tare, and stop-on-weight conditions still see real readings

Safety / robustness:

- Thermocouple NaN check uses `isnan()` instead of `== NAN` (which is always false in IEEE-754)
- Bad-temperature and steam-forgotten safety paths no longer block the main loop — UI keeps refreshing while the fault is active
- `modeSelect` now short-circuits all heater control when temperature is invalid or steam is forgotten on
- LCD and ToF init have bounded busy-waits (5s and 2s) — board no longer hangs at boot if the Nextion or VL53L0X is unplugged or dead
- I²C bus-clear loops feed the watchdog so a stuck bus can complete recovery instead of cycling resets
- Defensive guard around `selectedOperationalMode` reads from the Nextion — out-of-range values keep the last good mode rather than silently halting heater control
- `pulseHeaters` resets segment timing on long invocation gaps so brew↔steam transitions can't toggle the boiler immediately on stale state
- `lcdSetWeight` no longer overflows its buffer for weights ≥ 100 g
- Water-tank-low popup correctly suppresses on the brew screens (was a tautology that always fired)
- ADS pressure-sensor I²C bus probe is throttled to once per 500ms instead of once per 10ms loop
- Symmetric upper/lower bounds on EEPROM scale factors; reject zero (HX711 div-by-zero); upper bounds added on `hpwr`, `offsetTemp`, and the divider fields

HMI fixes:

- Home-page temperature progress bar now scales against the active setpoint (brew or steam) instead of using `currentTemp` directly as the picture index — fills smoothly all the way to 155 °C in steam mode instead of pegging at frame 99 the moment temp passes 99 °C. See [`lcd-hmi/home-tm0-steam-progress-fix.md`](lcd-hmi/home-tm0-steam-progress-fix.md).

Code hygiene:

- Globals in `gaggiuino.h` converted from definitions to `extern` declarations with definitions in `gaggiuino.ino`, removing a latent multi-definition trap
- Removed `peripherals.h` self-include
- Removed unprofessional comments in `descale.cpp`
- snprintf truncation checks tightened from `<=` to `<` for consistency

Tooling:

- [`scripts/convert-to-tjc.ps1`](scripts/convert-to-tjc.ps1) wraps the [andrew-harness fork of TFTTool](https://github.com/andrew-harness/TFTTool) to generate a TJC-compatible `.tft` from a Nextion-compiled one. Pinned to the fork because upstream UNUF/TFTTool stops at editor version 1.65.1 and current Gaggiuino `.HMI` files require 1.68.1.

## Intro
**Gaggiuino started as an idea to improve an already capable coffee machine while keeping the machine appearance and button functionality as close as possible to the original. An important part is that no internal cables/connectors were modified; all the connections were made by creating splitters using the purchased spade connectors.**
***
**For install instructions head to the project [documentation](https://gaggiuino.github.io/#/) section.**

*For project related help join us on [discord](https://discord.gg/eJTDJA3xfh).*

</div>
