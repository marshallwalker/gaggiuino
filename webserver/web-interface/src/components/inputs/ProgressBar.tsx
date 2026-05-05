import React, { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';

interface ProgressBarProps {
  value?: number;
}

function ProgressWithLabel({ value }: { value: number }) {
  return (
    <div className="flex items-center w-full">
      <div className="flex-1 mr-2">
        <Progress value={value} />
      </div>
      <div className="min-w-[35px] text-sm text-muted-foreground">
        {`${Math.round(value)}%`}
      </div>
    </div>
  );
}

export default function ProgressBar({ value }: ProgressBarProps = {}) {
  const [progress, setProgress] = useState(10);

  useEffect(() => {
    if (value !== undefined) return undefined;
    const timer = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 10 : prev + 10));
    }, 800);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <div className="w-full">
      <ProgressWithLabel value={value ?? progress} />
    </div>
  );
}
