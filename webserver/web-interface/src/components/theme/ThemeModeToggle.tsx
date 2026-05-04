import React, { createContext, useContext, useState } from 'react';
import { DarkModeToggle } from '@anatoliygatt/dark-mode-toggle';
import { useTheme } from '@mui/material';
import type { ThemeMode } from './AppTheme';

export interface ThemeModeContextValue {
  themeMode: ThemeMode;
  changeThemeMode: (mode: ThemeMode) => void;
}

export const ThemeModeContext = createContext<ThemeModeContextValue>({
  themeMode: 'dark',
  changeThemeMode: () => {},
});

export default function ThemeModeToggle() {
  const modeContext = useContext(ThemeModeContext);
  const [mode, setMode] = useState<ThemeMode>(modeContext.themeMode);
  const theme = useTheme();

  return (
    <DarkModeToggle
      mode={mode}
      size="sm"
      inactiveTrackColor={theme.palette.background.default}
      inactiveTrackColorOnHover={theme.palette.background.default}
      inactiveTrackColorOnActive={theme.palette.background.default}
      activeTrackColor={theme.palette.background.default}
      activeTrackColorOnHover={theme.palette.background.default}
      activeTrackColorOnActive={theme.palette.background.default}
      inactiveThumbColor={theme.palette.primary.main}
      activeThumbColor={theme.palette.primary.main}
      onChange={(newMode: ThemeMode) => {
        setMode(newMode);
        modeContext.changeThemeMode(newMode);
      }}
    />
  );
}
