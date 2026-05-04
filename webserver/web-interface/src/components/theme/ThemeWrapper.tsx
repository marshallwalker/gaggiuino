import { CssBaseline, ThemeProvider, useMediaQuery } from '@mui/material';
import React, { useMemo, useState, ReactNode } from 'react';
import getAppTheme, { ThemeMode } from './AppTheme';
import { ThemeModeContext } from './ThemeModeToggle';

const SAVED_THEME_MODE_KEY = 'savedTheme';

interface ThemeWrapperProps {
  children?: ReactNode;
}

export default function ThemeWrapper({ children }: ThemeWrapperProps) {
  const themeModeBrowserPreference: ThemeMode = useMediaQuery('(prefers-color-scheme: dark)') ? 'dark' : 'light';
  const savedThemeMode = localStorage.getItem(SAVED_THEME_MODE_KEY) as ThemeMode | null;

  const [themeMode, setThemeMode] = useState<ThemeMode>(savedThemeMode || themeModeBrowserPreference);

  const changeThemeMode = (newMode: ThemeMode) => {
    localStorage.setItem(SAVED_THEME_MODE_KEY, newMode);
    setThemeMode(newMode);
  };

  const modeContext = useMemo(() => ({ themeMode, changeThemeMode }), [themeMode]);
  const theme = useMemo(() => getAppTheme(themeMode), [themeMode]);

  return (
    <ThemeModeContext.Provider value={modeContext}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
