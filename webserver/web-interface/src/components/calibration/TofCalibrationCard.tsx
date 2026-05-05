import React, { useState } from 'react';
import { toast } from 'sonner';
import { Droplet, GlassWater } from 'lucide-react';
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import useSensorData from '@/hooks/useSensorData';
import { calibrateTofEmpty, calibrateTofFull } from '@/components/client/TofClient';

export default function TofCalibrationCard() {
  const sensorData = useSensorData();
  const [busy, setBusy] = useState<'full' | 'empty' | null>(null);

  async function handleCalibrate(target: 'full' | 'empty') {
    setBusy(target);
    const capturedRaw = sensorData.tofRangeRaw;
    try {
      if (target === 'full') {
        await calibrateTofFull();
        toast.success(`Tank FULL captured @ ${capturedRaw}mm`);
      } else {
        await calibrateTofEmpty();
        toast.success(`Tank EMPTY captured @ ${capturedRaw}mm`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Calibration request failed';
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  }

  const raw = sensorData.tofRangeRaw;
  const haveSignal = raw > 0;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-xl">Water-Tank ToF Calibration</CardTitle>
        <CardDescription>
          Fill the tank and capture FULL. Drop the tank to your &ldquo;refill now&rdquo;
          threshold and capture EMPTY. The percentage interpolates linearly
          between those two raw mm readings and persists across reboots.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Live raw range:
          </span>
          <span className="font-mono text-lg font-semibold">
            {haveSignal ? `${raw} mm` : '— no signal —'}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Current tank level reads {sensorData.waterLvl}%.
        </p>
      </CardContent>

      <CardFooter>
        <Button
          variant="outline"
          size="sm"
          disabled={!haveSignal || busy !== null}
          onClick={() => handleCalibrate('full')}
        >
          <Droplet />
          {busy === 'full' ? 'Capturing…' : 'Set FULL'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!haveSignal || busy !== null}
          onClick={() => handleCalibrate('empty')}
        >
          <GlassWater />
          {busy === 'empty' ? 'Capturing…' : 'Set EMPTY'}
        </Button>
      </CardFooter>
    </Card>
  );
}
