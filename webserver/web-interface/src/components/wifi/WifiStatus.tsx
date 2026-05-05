import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import type { WifiStatus as WifiStatusData } from '../client/WifiClient';

interface WifiStatusProps {
  status?: WifiStatusData | null;
}

export default function WifiStatus({ status = null }: WifiStatusProps) {
  const connected = !!status && status.status === 'connected';

  if (connected && status) {
    return (
      <div className="flex items-center gap-2">
        <Wifi className="h-4 w-4 text-[hsl(var(--success))]" />
        <span>{`${status.ssid} (${status.ip})`}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <WifiOff className="h-4 w-4" />
      <span>Not connected</span>
    </div>
  );
}
