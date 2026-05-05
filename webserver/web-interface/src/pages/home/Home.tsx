import React, { useState, useEffect, useRef } from 'react';
import { Plus, Minus, Scale } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { chartColor } from '@/lib/chartColors';
import GaugeChart from '@/components/chart/GaugeChart';
import GaugeLiquid from '@/components/chart/GaugeLiquid';
import ProfileList from '@/components/profiles/ProfileList';
import useSensorData from '@/hooks/useSensorData';
import useProfileList from '@/hooks/useProfileList';
import { setActiveProfile } from '@/components/client/ProfilesClient';

export default function Home() {
  const sensorData = useSensorData();
  const profiles = useProfileList();

  const handleSelectProfile = (index: number) => {
    setActiveProfile(index).catch((e) => {
      const msg = e instanceof Error ? e.message : 'Failed to switch profile';
      toast.error(msg);
    });
  };

  const boxRef = useRef<HTMLDivElement | null>(null);
  const [boxWidth, setBoxWidth] = useState(0);

  useEffect(() => {
    if (boxRef.current) {
      setBoxWidth(boxRef.current.getBoundingClientRect().width);
    }
  }, []);

  return (
    <div className="container mx-auto pt-2 px-2">
      <div className="grid grid-cols-12 gap-2">
        <div ref={boxRef} className="col-span-2 flex flex-col gap-2 rounded-2xl">
          <div className="flex items-center justify-center p-2 rounded-2xl">
            <GaugeLiquid value={sensorData.waterLvl} radius={boxWidth} />
          </div>
          <div className="flex items-center justify-center p-2 rounded-2xl">
            <GaugeChart value={sensorData.pressure} maintainAspectRatio={false} primaryColor={chartColor('pressure')} title="Pressure" unit="bar" maxValue={14} />
          </div>
          <div className="flex items-center justify-center p-2 rounded-2xl">
            <GaugeChart value={sensorData.weight} maintainAspectRatio={false} primaryColor={chartColor('weight')} title="Weight" unit="gr" maxValue={100} />
          </div>
        </div>

        <div className="col-span-6">
          <div className="rounded-2xl border bg-[#292929] h-full">
            <ProfileList
              profiles={profiles}
              activeIndex={sensorData.activeProfile}
              onSelect={handleSelectProfile}
            />
          </div>
        </div>

        <div className="col-span-4 flex flex-col gap-2">
          <div className="rounded-full bg-[#292929] flex items-center justify-center p-2">
            <GaugeChart value={sensorData.temperature} maxValue={sensorData.targetTemperature || 100} maintainAspectRatio primaryColor={chartColor('temperature')} unit="°C" />
          </div>

          <div className="flex items-center justify-center gap-6 p-2">
            <div className="w-24">
              <Label htmlFor="target-temp" className="text-xs text-muted-foreground">Target</Label>
              <Input
                id="target-temp"
                readOnly
                value={`${Math.round(sensorData.targetTemperature)}°C`}
                className="h-8"
              />
            </div>
            <Button variant="default" size="icon" className="rounded-full" aria-label="decrement target">
              <Minus />
            </Button>
            <Button variant="default" size="icon" className="rounded-full" aria-label="increment target">
              <Plus />
            </Button>
          </div>

          <div className="border-2 border-border rounded-2xl bg-[#292929] h-2" />

          <div className="flex items-center justify-center gap-6 p-2">
            <div className="w-24">
              <Label htmlFor="scales" className="text-xs text-muted-foreground">Scales</Label>
              <Input id="scales" readOnly defaultValue="0.0g" className="h-8" />
            </div>
            <Button variant="outline" className="w-2/5">
              <Scale />
              Tare
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
