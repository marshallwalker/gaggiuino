import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Typography,
} from '@mui/material';
import useSensorData from '../../hooks/useSensorData';
import { calibrateTofEmpty, calibrateTofFull } from '../client/TofClient';

export default function TofCalibrationCard() {
  const sensorData = useSensorData();
  const [busy, setBusy] = useState<'full' | 'empty' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);

  async function handleCalibrate(target: 'full' | 'empty') {
    setError(null);
    setBusy(target);
    try {
      if (target === 'full') {
        await calibrateTofFull();
        setLastAction(`Captured FULL @ ${sensorData.tofRangeRaw}mm`);
      } else {
        await calibrateTofEmpty();
        setLastAction(`Captured EMPTY @ ${sensorData.tofRangeRaw}mm`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Calibration request failed');
    } finally {
      setBusy(null);
    }
  }

  const raw = sensorData.tofRangeRaw;
  const haveSignal = raw > 0;

  return (
    <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <CardContent sx={{ flex: '1 0 auto' }}>
        <Typography gutterBottom variant="h5" component="div">
          Water-Tank ToF Calibration
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Fill the tank, capture FULL. Empty it (or pull the sensor off the
          lid so it sees the bottom), capture EMPTY. The percentage is
          linearly interpolated between those two raw mm readings and
          persists across reboots.
        </Typography>

        <Box sx={{
          display: 'flex', alignItems: 'baseline', gap: 1, mb: 1,
        }}
        >
          <Typography variant="overline">Live raw range:</Typography>
          <Typography variant="h6" sx={{ fontFamily: 'monospace' }}>
            {haveSignal ? `${raw} mm` : '— no signal —'}
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          Current tank level reads {sensorData.waterLvl}%.
        </Typography>

        {lastAction && (
          <Typography variant="body2" color="success.main" sx={{ mt: 2 }}>
            {lastAction}
          </Typography>
        )}
        {error && (
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </CardContent>
      <CardActions>
        <Button
          variant="outlined"
          size="small"
          disabled={!haveSignal || busy !== null}
          onClick={() => handleCalibrate('full')}
        >
          {busy === 'full' ? 'Capturing…' : 'Set FULL'}
        </Button>
        <Button
          variant="outlined"
          size="small"
          color="secondary"
          disabled={!haveSignal || busy !== null}
          onClick={() => handleCalibrate('empty')}
        >
          {busy === 'empty' ? 'Capturing…' : 'Set EMPTY'}
        </Button>
      </CardActions>
    </Card>
  );
}
