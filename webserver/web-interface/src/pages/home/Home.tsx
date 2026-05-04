import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Container, useTheme, Fab, TextField, Grid, Button,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ScaleIcon from '@mui/icons-material/Scale';
import GaugeChart from '../../components/chart/GaugeChart';
import GaugeLiquid from '../../components/chart/GaugeLiquid';
import ProfileList from '../../components/profiles/ProfileList';
import useSensorData from '../../hooks/useSensorData';
import useProfileList from '../../hooks/useProfileList';
import { setActiveProfile } from '../../components/client/ProfilesClient';

export default function Home() {
  const sensorData = useSensorData();
  const profiles = useProfileList();
  const theme = useTheme();

  const handleSelectProfile = (index: number) => {
    setActiveProfile(index).catch(() => {
      // Network error or 422 - swallow for now. The sensor stream will
      // continue to reflect the actual active profile so the UI stays
      // consistent regardless.
    });
  };

  const boxRef = useRef<HTMLDivElement | null>(null);
  const [boxSize, setBoxSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useEffect(() => {
    if (boxRef.current) {
      const { width, height } = boxRef.current.getBoundingClientRect();
      setBoxSize({ width, height });
    }
  }, []);

  function boxedComponent(component: React.ReactNode) {
    return (
      <Box
        ref={boxRef}
        sx={{
          border: `0px solid ${theme.palette.divider}`,
          position: 'relative',
          justifyContent: 'space-evenly',
          alignItems: 'center',
          display: 'flex',
          borderRadius: '20px',
          width: '100%',
          padding: '10px',
        }}
        style={{ marginTop: '-9px' }}
      >
        {component}
      </Box>
    );
  }

  return (
    <Container sx={{ pt: theme.spacing(2), gap: '0px' }}>
      <Grid container columns={12} spacing={1} sx={{ mb: theme.spacing(1), gap: '0px' }}>
        <Grid item xs={2}>
          <Box sx={{ border: `0px solid ${theme.palette.divider}`, position: 'relative', borderRadius: '16px', width: '100%', padding: '0px', gap: '0px' }}>
            {boxedComponent(<GaugeLiquid value={sensorData.waterLvl} radius={boxSize.width} />)}
            {boxedComponent(<GaugeChart value={sensorData.pressure} maintainAspectRatio={false} primaryColor={theme.palette.pressure.main} title="Pressure" unit="bar" maxValue={14} />)}
            {boxedComponent(<GaugeChart value={sensorData.weight} maintainAspectRatio={false} primaryColor={theme.palette.weight.main} title="Weight" unit="gr" maxValue={100} />)}
          </Box>
        </Grid>
        <Grid item xs={6} sx={{ gap: '8px' }}>
          <Box sx={{ border: `0.1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'flex-start', position: 'relative', borderRadius: '16px', width: '100%', height: '100%', padding: '0px', backgroundColor: '#292929' }}>
            <ProfileList
              profiles={profiles}
              activeIndex={sensorData.activeProfile}
              onSelect={handleSelectProfile}
            />
          </Box>
        </Grid>
        <Grid item xs={4}>
          <Box sx={{ border: `0px solid ${theme.palette.divider}`, position: 'relative', borderRadius: '16px', width: '100%', padding: '0px' }}>
            <Box sx={{ justifyContent: 'space-evenly', alignItems: 'center', display: 'flex', border: `0px solid ${theme.palette.divider}`, position: 'relative', borderRadius: '180px', width: '100%', padding: '0px', backgroundColor: '#292929' }}>
              {boxedComponent(<GaugeChart value={sensorData.temperature} maxValue={sensorData.targetTemperature || 100} maintainAspectRatio primaryColor={theme.palette.temperature.main} unit="°C" />)}
            </Box>
            <Box sx={{ justifyContent: 'center', alignItems: 'center', display: 'flex', border: `0px solid ${theme.palette.divider}`, position: 'relative', borderRadius: '16px', width: '100%', padding: '10px', gap: '25px' }}>
              <TextField variant="standard" sx={{ width: '10ch' }} id="target-temp" label="Target" value={`${Math.round(sensorData.targetTemperature)}°C`} InputProps={{ readOnly: true }} />
              <Fab color="primary" aria-label="add">
                <RemoveIcon />
              </Fab>
              <Fab color="primary" aria-label="rem">
                <AddIcon />
              </Fab>
            </Box>
            <Box sx={{ justifyContent: 'center', alignItems: 'center', display: 'flex', border: `2px solid ${theme.palette.divider}`, position: 'relative', borderRadius: '16px', width: '100%', padding: '2px', gap: '0px', backgroundColor: '#292929' }} />
            <Box sx={{ justifyContent: 'center', alignItems: 'center', display: 'flex', border: `0px solid ${theme.palette.divider}`, position: 'relative', borderRadius: '16px', width: '100%', padding: '10px', gap: '25px' }}>
              <TextField variant="standard" sx={{ width: '10ch' }} id="scales" label="Scales" defaultValue="0.0g" InputProps={{ readOnly: true }} />
              <Button variant="outlined" startIcon={<ScaleIcon />} sx={{ width: '40%' }}>
                Tare
              </Button>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}
