import axios from 'axios';

/**
 * Snapshot the current ToF raw mm reading as the new "tank full" reference.
 * The STM clamps + persists to EEPROM and from then on linearly interpolates
 * the percentage against the new endpoint.
 */
export async function calibrateTofFull(): Promise<void> {
  await axios.post('/api/tof/calibrate/full');
}

/**
 * Snapshot the current ToF raw mm reading as the new "tank empty" reference.
 * Must be greater (numerically) than the "full" reading or the STM will
 * reject the write and roll back the in-memory copy.
 */
export async function calibrateTofEmpty(): Promise<void> {
  await axios.post('/api/tof/calibrate/empty');
}
