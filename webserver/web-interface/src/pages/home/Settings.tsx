import React, { useState } from 'react';
import { Paperclip } from 'lucide-react';
import {
  Card, CardContent, CardFooter, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import WifiSettingsCard from '@/components/wifi/WifiSettingsCard';
import ProgressBar from '@/components/inputs/ProgressBar';
import LogContainer from '@/components/log/LogContainer';
import TofCalibrationCard from '@/components/calibration/TofCalibrationCard';

type OtaTarget = 'blackpill' | 'esp32-flash' | 'esp32-filesystem';

export default function Settings() {
  const [otaTarget, setOtaTarget] = useState<OtaTarget>('blackpill');

  return (
    <div className="container mx-auto px-4 mt-2">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
        <div className="md:col-span-4">
          <WifiSettingsCard />
        </div>
        <div className="md:col-span-8">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="text-xl">OTA Update</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4">
              <ProgressBar />
              <RadioGroup
                value={otaTarget}
                onValueChange={(v) => setOtaTarget(v as OtaTarget)}
                aria-labelledby="ota-target-label"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="blackpill" id="ota-blackpill" />
                  <Label htmlFor="ota-blackpill">STM32-Blackpill</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="esp32-flash" id="ota-esp32-flash" />
                  <Label htmlFor="ota-esp32-flash">ESP32-Flash</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="esp32-filesystem" id="ota-esp32-fs" />
                  <Label htmlFor="ota-esp32-fs">ESP32-Filesystem</Label>
                </div>
              </RadioGroup>
            </CardContent>
            <CardFooter>
              <Button variant="ghost" size="icon" asChild>
                <label htmlFor="ota-firmware-file" aria-label="Select firmware" className="cursor-pointer">
                  <Paperclip />
                  <input id="ota-firmware-file" hidden accept=".bin" type="file" />
                </label>
              </Button>
              <Button>Upload</Button>
            </CardFooter>
          </Card>
        </div>
        <div className="md:col-span-6">
          <TofCalibrationCard />
        </div>
        <div className="md:col-span-12">
          <LogContainer />
        </div>
      </div>
    </div>
  );
}
