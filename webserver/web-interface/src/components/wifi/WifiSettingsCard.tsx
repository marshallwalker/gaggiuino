import React, { useEffect, useState } from 'react';
import {
  Card, CardContent, CardFooter, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  disconnectFromWifi, getWifiStatus, WifiStatus as WifiStatusData,
} from '../client/WifiClient';
import Loader from '../loader/Loader';
import WifiStatus from './WifiStatus';
import AvailableNetworksDrawer from './available-networks/AvailableNetworksDrawer';

export default function WifiSettingsCard() {
  const [wifiStatus, setWifiStatus] = useState<WifiStatusData | null>(null);
  const [wifiStatusLoading, setWifiStatusLoading] = useState(true);
  const [wifiDrawerOpen, setWiFiDrawerOpen] = useState(false);

  const isConnected = !!wifiStatus && wifiStatus.status === 'connected';

  async function loadWiFiStatus() {
    try {
      setWifiStatusLoading(true);
      const status = await getWifiStatus();
      setWifiStatus(status);
    } catch (e) {
      setWifiStatus(null);
    } finally {
      setWifiStatusLoading(false);
    }
  }

  async function disconnect() {
    await disconnectFromWifi();
    return loadWiFiStatus();
  }

  useEffect(() => {
    loadWiFiStatus();
  }, []);

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle className="text-xl">WiFi Status</CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          {wifiStatusLoading ? <Loader /> : <WifiStatus status={wifiStatus} />}
        </CardContent>
        <CardFooter>
          {isConnected && (
            <>
              <Button variant="outline" size="sm" onClick={() => disconnect()}>Disconnect</Button>
              <Button variant="outline" size="sm" onClick={() => setWiFiDrawerOpen(true)}>Change</Button>
            </>
          )}
          {!isConnected && (
            <Button variant="outline" size="sm" onClick={() => setWiFiDrawerOpen(true)}>Connect</Button>
          )}
          <Button variant="outline" size="sm" onClick={() => loadWiFiStatus()}>Refresh</Button>
        </CardFooter>
      </Card>
      <AvailableNetworksDrawer open={wifiDrawerOpen} onOpenChanged={setWiFiDrawerOpen} onConnected={loadWiFiStatus} />
    </>
  );
}
