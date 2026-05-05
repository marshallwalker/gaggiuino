import React, { useEffect, useState } from 'react';
import useWebSocket from 'react-use-websocket';
import { X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  apiHost, filterSocketMessage, MSG_TYPE_SHOT_DATA, ShotData, WsEnvelope,
} from '../../models/api';
import ShotChart from '../../components/chart/ShotChart';
import {
  PressureStatBox, PumpFlowStatBox, TemperatureStatBox, TimeStatBox, WeightFlowStatBox, WeightStatBox,
} from '../../components/chart/StatBox';

interface ShotDialogProps {
  open?: boolean;
  setOpen: (open: boolean) => void;
}

export default function ShotDialog({ open = false, setOpen }: ShotDialogProps) {
  const { lastJsonMessage } = useWebSocket(`ws://${apiHost}/ws`, {
    share: true,
    retryOnError: true,
    shouldReconnect: () => true,
    reconnectAttempts: 1000,
    filter: (message) => filterSocketMessage(message, MSG_TYPE_SHOT_DATA),
  });

  const [latestShotSnapshot, setLatestShotSnapshot] = useState<ShotData | null>(null);

  useEffect(() => {
    const envelope = lastJsonMessage as WsEnvelope<ShotData> | null;
    if (envelope === null) return;
    setLatestShotSnapshot(envelope.data);
  }, [lastJsonMessage]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        hideCloseButton
        className="max-w-none w-screen h-screen p-0 rounded-none border-0 translate-x-0 translate-y-0 left-0 top-0 grid-rows-[auto_1fr] gap-0"
      >
        <div className="flex items-center bg-primary text-primary-foreground px-2 py-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            <X />
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 p-2 overflow-auto">
          <div className="sm:col-span-3 relative w-full min-h-[300px]">
            <ShotChart newDataPoint={latestShotSnapshot ?? undefined} />
          </div>
          <div className="sm:col-span-1">
            {latestShotSnapshot && (
              <div className="grid grid-cols-1 sm:grid-cols-1 gap-2">
                <TimeStatBox timeInShot={latestShotSnapshot.timeInShot} />
                <WeightStatBox shotWeight={latestShotSnapshot.shotWeight} />
                <PressureStatBox pressure={latestShotSnapshot.pressure} target={latestShotSnapshot.targetPressure} />
                <PumpFlowStatBox pumpFlow={latestShotSnapshot.pumpFlow} target={latestShotSnapshot.targetPumpFlow} />
                <WeightFlowStatBox flow={latestShotSnapshot.weightFlow} target={latestShotSnapshot.targetPumpFlow} />
                <TemperatureStatBox temperature={latestShotSnapshot.temperature} target={latestShotSnapshot.targetTemperature} />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
