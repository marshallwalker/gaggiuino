import React, { useState } from 'react';
import { Wifi } from 'lucide-react';
import {
  AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { connectToWifi, WifiNetwork } from '../../client/WifiClient';
import Loader from '../../loader/Loader';

interface AvailableNetworkProps {
  network: WifiNetwork;
  onConnected?: (network: WifiNetwork) => void;
}

export default function AvailableNetwork({
  network,
  onConnected = () => {},
}: AvailableNetworkProps) {
  const [password, setPassword] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setConnecting(true);
    setConnectionError(false);
    try {
      await connectToWifi({ ssid: network.ssid, pass: password });
      onConnected(network);
    } catch (err) {
      setConnectionError(true);
    } finally {
      setConnecting(false);
    }
  }

  return (
    <AccordionItem value={network.ssid}>
      <AccordionTrigger>
        <div className="flex items-center gap-2">
          <Wifi className="h-4 w-4" />
          <span>{network.ssid}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        {connectionError && (
          <Alert variant="destructive" className="mb-2">
            <AlertDescription>Failed to connect to WiFi</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Input
            id={`pwd-${network.ssid}`}
            type="password"
            placeholder="Password"
            autoComplete="on"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="sm:flex-1"
          />
          <Button type="submit" variant="outline" disabled={connecting}>
            {connecting && <Loader />}
            Connect
          </Button>
        </form>
      </AccordionContent>
    </AccordionItem>
  );
}
