import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProfileSummary } from '../../models/api';

interface ProfileListProps {
  profiles: ProfileSummary[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export default function ProfileList({ profiles, activeIndex, onSelect }: ProfileListProps) {
  return (
    <div className="w-full p-2">
      <div className="px-1 text-xs uppercase tracking-wider text-muted-foreground mb-1">
        Profiles
      </div>
      <ul className="space-y-1">
        {profiles.map((profile) => {
          const isActive = profile.index === activeIndex;
          return (
            <li key={profile.index}>
              <button
                type="button"
                onClick={() => onSelect(profile.index)}
                className={cn(
                  'w-full flex items-center justify-between rounded-md border px-3 py-1.5 text-sm text-left transition-colors',
                  isActive
                    ? 'border-primary bg-primary/10 text-primary font-semibold hover:bg-primary/20'
                    : 'border-transparent text-foreground hover:bg-accent',
                )}
              >
                <span>{profile.name}</span>
                {isActive && <CheckCircle2 className="h-4 w-4 text-primary" />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
