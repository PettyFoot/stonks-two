'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  Theme, 
  ThemeContextType, 
  ThemeMode,
  defaultTheme,
  availableThemes,
  applyThemeToDOM,
  saveThemePreference,
  getThemePreference,
  getThemeByName
} from '@/lib/themes';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(defaultTheme);
  const [currentMode, setCurrentMode] = useState<ThemeMode>('default');

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedThemeName = getThemePreference();
    if (savedThemeName) {
      const theme = getThemeByName(savedThemeName);
      setCurrentTheme(theme);
      setCurrentMode(theme.name as ThemeMode);
    }
  }, []);

  // Apply theme to DOM whenever theme changes
  useEffect(() => {
    applyThemeToDOM(currentTheme);
  }, [currentTheme]);

  const setTheme = (theme: Theme) => {
    setCurrentTheme(theme);
    setCurrentMode(theme.name as ThemeMode);
    saveThemePreference(theme.name);
  };

  const setMode = (mode: ThemeMode) => {
    const theme = getThemeByName(mode);
    setTheme(theme);
  };

  const contextValue: ThemeContextType = {
    theme: currentTheme,
    setTheme,
    currentMode,
    setMode,
    availableThemes
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};