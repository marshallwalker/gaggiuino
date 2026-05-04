import axios from 'axios';
import type { LogRecord } from '../../models/api';

/**
 * Fetches the ESP webserver's in-memory rolling log history
 * (most recent ~100 lines). Used by useLogStream on mount to
 * seed the buffer with everything that arrived before the
 * current WebSocket subscription was established (or after a
 * browser refresh that wiped the React-side buffer).
 */
export async function getLogs(): Promise<LogRecord[]> {
  return axios.get<LogRecord[]>('/api/logs').then(({ data }) => data);
}
