import { useEffect, useState } from 'react';
import useWebSocket from 'react-use-websocket';
import {
  apiHost,
  filterJsonMessage,
  filterSocketMessage,
  MSG_TYPE_PROFILE_NAMES,
  ProfileSummary,
  WsEnvelope,
} from '../models/api';
import { getProfiles } from '../components/client/ProfilesClient';

/**
 * Provides the current list of profiles. Fetches once via /api/profiles on
 * mount, then listens for `profile_names_update` WebSocket frames so the UI
 * stays in sync if a profile is renamed or the active one is switched
 * elsewhere (Nextion LCD, another browser tab).
 */
export default function useProfileList(): ProfileSummary[] {
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    getProfiles()
      .then((data) => {
        if (!cancelled) setProfiles(data);
      })
      .catch(() => {
        // 503 on first load before STM has pushed names yet is normal -
        // the WebSocket subscription below will fill in once they arrive.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { lastJsonMessage } = useWebSocket(`ws://${apiHost}/ws`, {
    share: true,
    retryOnError: true,
    shouldReconnect: () => true,
    reconnectAttempts: 1000,
    filter: (message) => filterSocketMessage(message, MSG_TYPE_PROFILE_NAMES),
  });

  useEffect(() => {
    const envelope = lastJsonMessage as WsEnvelope<ProfileSummary[]> | null;
    if (envelope && filterJsonMessage(envelope, MSG_TYPE_PROFILE_NAMES)) {
      setProfiles(envelope.data);
    }
  }, [lastJsonMessage]);

  return profiles;
}
