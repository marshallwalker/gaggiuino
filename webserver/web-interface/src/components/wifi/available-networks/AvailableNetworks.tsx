import React, { useEffect, useState } from 'react';
import { Alert, Box } from '@mui/material';
import { getAvailableNetworks, WifiNetwork } from '../../client/WifiClient';
import Loader from '../../loader/Loader';
import AvailableNetwork from './AvailableNetwork';

interface AvailableNetworksProps {
  onConnected?: () => void;
}

export default function AvailableNetworks({ onConnected = () => {} }: AvailableNetworksProps) {
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [loading, setLoading] = useState(false);
  const [networksError, setNetworksError] = useState(false);
  const [expandedNetworkId, setExpandedNetworkId] = useState<string | null>(null);

  useEffect(() => {
    const loadNetworks = async () => {
      if (loading) return;
      try {
        setLoading(true);
        setNetworksError(false);
        const networksResponse = await getAvailableNetworks();
        setNetworks(networksResponse);
      } catch (e) {
        setNetworksError(true);
      } finally {
        setLoading(false);
      }
    };
    loadNetworks();
  }, []);

  if (networksError) {
    return <Alert severity="error">Failed to load available networks</Alert>;
  }

  return loading
    ? <Box display="flex" justifyContent="center"><Loader /></Box>
    : (
      <div>
        {networks.map((network) => (
          <AvailableNetwork
            key={network.ssid}
            network={network}
            onClick={() => (network.ssid === expandedNetworkId
              ? setExpandedNetworkId(null)
              : setExpandedNetworkId(network.ssid))}
            expanded={expandedNetworkId === network.ssid}
            onConnected={() => {
              setExpandedNetworkId(null);
              onConnected();
            }}
          />
        ))}
      </div>
    );
}
