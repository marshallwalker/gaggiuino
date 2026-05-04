import React, { useEffect, useRef, useState } from 'react';
import {
  Box, FormControlLabel, Paper, Stack, Switch, Typography, useTheme,
} from '@mui/material';
import useLogStream from '../../hooks/useLogStream';

interface LogContainerProps {
  maxLines?: number;
}

export default function LogContainer({ maxLines = 200 }: LogContainerProps) {
  const theme = useTheme();
  const logLines = useLogStream(maxLines);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [followLogs, setFollowLogs] = useState(false);

  useEffect(() => {
    if (followLogs) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logLines, followLogs]);

  const onChangeSwitch = (_event: React.ChangeEvent<HTMLInputElement>, newValue: boolean) => {
    setFollowLogs(newValue);
  };

  return (
    <Paper elevation={3} sx={{ p: theme.spacing(2) }}>
      <Stack direction="row" alignItems="center">
        <Typography sx={{ flexGrow: 1 }} gutterBottom variant="h5">Logs</Typography>
        <FormControlLabel
          control={<Switch value={followLogs} onChange={onChangeSwitch} />}
          label="Follow logs"
          labelPlacement="start"
        />
      </Stack>
      <Box sx={{ overflow: 'auto', height: '300px' }}>
        {logLines.map((line, index) => (
          // eslint-disable-next-line react/no-array-index-key
          <Typography key={index} variant="body2">{`[${line.source}] ${line.log}`}</Typography>
        ))}
        <div ref={bottomRef} />
      </Box>
    </Paper>
  );
}
