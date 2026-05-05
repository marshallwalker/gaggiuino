import React from 'react';
import WifiSettingsCard from '@/components/wifi/WifiSettingsCard';
import LogContainer from '@/components/log/LogContainer';
import TofCalibrationCard from '@/components/calibration/TofCalibrationCard';

export default function Settings() {
  return (
    <div className="container mx-auto px-4 mt-2">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
        <div className="md:col-span-6">
          <WifiSettingsCard />
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
