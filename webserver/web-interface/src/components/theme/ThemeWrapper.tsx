import React, {
  useEffect, useMemo, useState, ReactNode,
} from 'react';
import { ThemeModeContext, ThemeMode } from './ThemeModeToggle';

const SAVED_THEME_MODE_KEY = 'savedTheme';

interface ThemeWrapperProps {
  children?: ReactNode;
}

function getInitialMode(): ThemeMode {
  const saved = localStorage.getItem(SAVED_THEME_MODE_KEY) as ThemeMode | null;
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function ThemeWrapper({ children }: ThemeWrapperProps) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialMode);

  const changeThemeMode = (newMode: ThemeMode) => {
    localStorage.setItem(SAVED_THEME_MODE_KEY, newMode);
    setThemeMode(newMode);
  };

  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [themeMode]);

  const modeContext = useMemo(() => ({ themeMode, changeThemeMode }), [themeMode]);

  return (
    <ThemeModeContext.Provider value={modeContext}>
      {children}
    </ThemeModeContext.Provider>
  );
}
