import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  getLogLevel, LOG_LEVEL_LABELS, LOG_LEVEL_ORDER, LogLevel,
} from '@/models/api';
import useLogStream from '@/hooks/useLogStream';

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

  return (
    <Card className="p-4 shadow-md">
      <div className="flex items-center gap-3 mb-2">
        <h2 className="flex-1 text-xl font-semibold">Logs</h2>
        <div className="w-[140px]">
          <Select value={minLevel} onValueChange={(v) => setMinLevel(v as LogLevel)}>
            <SelectTrigger className="h-9" aria-label="Min log level">
              <SelectValue placeholder="Min level" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(LOG_LEVEL_LABELS) as LogLevel[]).map((level) => (
                <SelectItem key={level} value={level}>{LOG_LEVEL_LABELS[level]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="log-follow" className="cursor-pointer">Follow</Label>
          <Switch id="log-follow" checked={followLogs} onCheckedChange={setFollowLogs} />
        </div>
      </div>
      <div className="overflow-auto h-[300px] font-mono text-sm">
        {filteredLogs.map((line, index) => {
          const level = getLogLevel(line.log);
          return (
            <div
              // eslint-disable-next-line react/no-array-index-key
              key={index}
              className="whitespace-pre-wrap"
              style={{ color: LEVEL_COLORS[level] }}
            >
              {`[${line.source}] ${line.log}`}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </Card>
  );
}
