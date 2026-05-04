import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, FormControl, FormControlLabel, InputLabel, MenuItem, Paper,
  Select, SelectChangeEvent, Stack, Switch, Typography, useTheme,
} from '@mui/material';
import {
  getLogLevel, LOG_LEVEL_LABELS, LOG_LEVEL_ORDER, LogLevel,
} from '../../models/api';
import useLogStream from '../../hooks/useLogStream';

interface LogContainerProps {
  maxLines?: number;
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  E: '#ef4040',
  I: '#6296C5',
  V: '#888',
  D: '#666',
};

export default function LogContainer({ maxLines = 200 }: LogContainerProps) {
  const theme = useTheme();
  const logLines = useLogStream(maxLines);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [followLogs, setFollowLogs] = useState(false);
  const [minLevel, setMinLevel] = useState<LogLevel>('V');

  const filteredLogs = useMemo(
    () => logLines.filter((line) => LOG_LEVEL_ORDER[getLogLevel(line.log)] <= LOG_LEVEL_ORDER[minLevel]),
    [logLines, minLevel],
  );

  useEffect(() => {
    if (followLogs) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs, followLogs]);

  const onChangeFollow = (_event: React.ChangeEvent<HTMLInputElement>, newValue: boolean) => {
    setFollowLogs(newValue);
  };

  const onChangeLevel = (event: SelectChangeEvent<LogLevel>) => {
    setMinLevel(event.target.value as LogLevel);
  };

  return (
    <Paper elevation={3} sx={{ p: theme.spacing(2) }}>
      <Stack direction="row" alignItems="center" spacing={2}>
        <Typography sx={{ flexGrow: 1 }} gutterBottom variant="h5">Logs</Typography>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel id="log-level-label">Min level</InputLabel>
          <Select
            labelId="log-level-label"
            label="Min level"
            value={minLevel}
            onChange={onChangeLevel}
          >
            {(Object.keys(LOG_LEVEL_LABELS) as LogLevel[]).map((level) => (
              <MenuItem key={level} value={level}>{LOG_LEVEL_LABELS[level]}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControlLabel
          control={<Switch checked={followLogs} onChange={onChangeFollow} />}
          label="Follow"
          labelPlacement="start"
        />
      </Stack>
      <Box sx={{ overflow: 'auto', height: '300px', fontFamily: 'monospace' }}>
        {filteredLogs.map((line, index) => {
          const level = getLogLevel(line.log);
          return (
            <Typography
              // eslint-disable-next-line react/no-array-index-key
              key={index}
              variant="body2"
              sx={{ color: LEVEL_COLORS[level], whiteSpace: 'pre-wrap' }}
            >
              {`[${line.source}] ${line.log}`}
            </Typography>
          );
        })}
        <div ref={bottomRef} />
      </Box>
    </Paper>
  );
}
