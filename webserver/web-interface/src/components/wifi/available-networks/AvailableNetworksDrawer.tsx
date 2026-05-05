import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { refrehNetworks } from '../../client/WifiClient';
import Loader from '../../loader/Loader';
import AvailableNetworks from './AvailableNetworks';

interface AvailableNetworksDrawerProps {
  open: boolean;
  onOpenChanged: (open: boolean) => void;
  onConnected?: () => void;
}

export default function AvailableNetworksDrawer({
  open, onOpenChanged, onConnected = () => {},
}: AvailableNetworksDrawerProps) {
  const [networksRefreshing, setNetworksRefreshing] = useState(false);
  const [wifiDrawerRefreshKey, setWifiDrawerRefreshKey] = useState(0);

  async function refreshNetworksAction() {
    setNetworksRefreshing(true);
    try {
      await refrehNetworks();
      setWifiDrawerRefreshKey((oldKey) => oldKey + 1);
    } finally {
      setNetworksRefreshing(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChanged}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="flex-row items-center justify-between space-y-0">
          <SheetTitle className="text-xl">Available networks</SheetTitle>
          <Button variant="ghost" size="icon" onClick={refreshNetworksAction} aria-label="Refresh">
            <RefreshCw />
          </Button>
        </SheetHeader>
        {networksRefreshing && <div className="flex justify-center py-4"><Loader /></div>}
        {!networksRefreshing && <AvailableNetworks key={wifiDrawerRefreshKey} onConnected={onConnected} />}
      </SheetContent>
    </Sheet>
  );
}
