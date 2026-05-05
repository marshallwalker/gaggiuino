import { CssBaseline, ThemeProvider, useMediaQuery } from '@mui/material';
import React, {
  useEffect, useMemo, useState, ReactNode,
} from 'react';
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

  // Toggle the `dark` class on <html> so Tailwind/shadcn dark variants
  // resolve correctly. Pages already migrated to shadcn pick this up;
  // pages still on MUI continue to use the ThemeProvider below.
  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [themeMode]);

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
