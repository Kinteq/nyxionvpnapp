'use client';

import { useCallback, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

const getSystemTheme = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';

export function useThemeController() {
  const [theme, setTheme] = useState<ThemeMode>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  const applyTheme = useCallback((mode: 'light' | 'dark') => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('dark', mode === 'dark');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = (localStorage.getItem('theme') as ThemeMode | null) || 'system';
    const systemTheme = getSystemTheme();
    const initialResolved = stored === 'system' ? systemTheme : stored;

    setTheme(stored);
    setResolvedTheme(initialResolved);
    applyTheme(initialResolved);

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      if (stored === 'system') {
        const newResolved = event.matches ? 'dark' : 'light';
        setResolvedTheme(newResolved);
        applyTheme(newResolved);
      }
    };

    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [applyTheme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const systemTheme = getSystemTheme();
    const nextResolved = theme === 'system' ? systemTheme : theme;
    setResolvedTheme(nextResolved);
    applyTheme(nextResolved);
    localStorage.setItem('theme', theme);
  }, [theme, applyTheme]);

  const setThemeMode = (mode: ThemeMode) => setTheme(mode);

  return {
    theme,
    resolvedTheme,
    isDark: resolvedTheme === 'dark',
    setTheme: setThemeMode,
  };
}