'use client';

import React, { createContext, useContext } from 'react';
import { ThemeMode, useThemeController } from '@/hooks/useTheme';

type ThemeContextValue = {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  isDark: boolean;
  setTheme: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const value = useThemeController();
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemeContext must be used within ThemeProvider');
  }
  return ctx;
}