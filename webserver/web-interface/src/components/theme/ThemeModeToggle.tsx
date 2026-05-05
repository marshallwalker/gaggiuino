import React, { createContext, useContext, useState } from 'react';
import { DarkModeToggle } from '@anatoliygatt/dark-mode-toggle';

export type ThemeMode = 'light' | 'dark';

export interface ThemeModeContextValue {
  themeMode: ThemeMode;
  changeThemeMode: (mode: ThemeMode) => void;
}

export const ThemeModeContext = createContext<ThemeModeContextValue>({
  themeMode: 'dark',
  changeThemeMode: () => {},
});

const TRACK = '#111';
const THUMB = '#ef4e2b';

export default function ThemeModeToggle() {
  const modeContext = useContext(ThemeModeContext);
  const [mode, setMode] = useState<ThemeMode>(modeContext.themeMode);

  return (
    <DarkModeToggle
      mode={mode}
      size="sm"
      inactiveTrackColor={TRACK}
      inactiveTrackColorOnHover={TRACK}
      inactiveTrackColorOnActive={TRACK}
      activeTrackColor={TRACK}
      activeTrackColorOnHover={TRACK}
      activeTrackColorOnActive={TRACK}
      inactiveThumbColor={THUMB}
      activeThumbColor={THUMB}
      onChange={(newMode: ThemeMode) => {
        setMode(newMode);
        modeContext.changeThemeMode(newMode);
      }}
    />
  );
}
