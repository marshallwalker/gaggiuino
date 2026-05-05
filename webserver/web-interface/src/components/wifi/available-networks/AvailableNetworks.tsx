import React, { useEffect, useState } from 'react';
import { Accordion } from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  const [expandedNetworkId, setExpandedNetworkId] = useState<string>('');

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
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertDescription>Failed to load available networks</AlertDescription>
      </Alert>
    );
  }

  if (loading) return <div className="flex justify-center py-4"><Loader /></div>;

  return (
    <Accordion
      type="single"
      collapsible
      value={expandedNetworkId}
      onValueChange={setExpandedNetworkId}
      className="mt-4"
    >
      {networks.map((network) => (
        <AvailableNetwork
          key={network.ssid}
          network={network}
          onConnected={() => {
            setExpandedNetworkId('');
            onConnected();
          }}
        />
      ))}
    </Accordion>
  );
}
