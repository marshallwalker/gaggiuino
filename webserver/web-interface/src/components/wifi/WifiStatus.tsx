import React from 'react';
import SignalWifi3BarIcon from '@mui/icons-material/SignalWifi3Bar';
import SignalWifiOffIcon from '@mui/icons-material/SignalWifiOff';
import { Stack, Typography } from '@mui/material';
import type { WifiStatus as WifiStatusData } from '../client/WifiClient';

interface WifiStatusProps {
  status?: WifiStatusData | null;
}

export default function WifiStatus({ status = null }: WifiStatusProps) {
  function isConnected(): boolean {
    return !!status && status.status === 'connected';
  }

  return isConnected() && status
    ? (
      <Stack spacing={1} direction="row" alignItems="center">
        <SignalWifi3BarIcon color="success" />
        <Typography>{`${status.ssid} (${status.ip})`}</Typography>
      </Stack>
    )
    : (
      <Stack spacing={1} direction="row" alignItems="center">
        <SignalWifiOffIcon />
        <Typography>Not connected</Typography>
      </Stack>
    );
}
