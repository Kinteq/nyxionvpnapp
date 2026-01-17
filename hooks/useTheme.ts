'use client';

import { useCallback, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

const getSystemTheme = (): 'light' | 'dark' =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';

export function useThemeController() {
  const [theme, setTheme] = useState<ThemeMode>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  const applyTheme = useCallback((mode: 'light' | 'dark') => {
    if (typeof document === 'undefined') return;
    
    // Применяем тему мгновенно
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = (localStorage.getItem('theme') as ThemeMode | null) || 'system';
    const systemTheme = getSystemTheme();
    const initialResolved = stored === 'system' ? systemTheme : stored;

    setTheme(stored);
    setResolvedTheme(initialResolved);
    
    // Применяем без анимации при инициализации
    if (initialResolved === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      if (theme === 'system') {
        const newResolved = event.matches ? 'dark' : 'light';
        setResolvedTheme(newResolved);
        applyTheme(newResolved);
      }
    };

    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setTheme(mode);
    localStorage.setItem('theme', mode);
    
    const systemTheme = getSystemTheme();
    const nextResolved = mode === 'system' ? systemTheme : mode;
    setResolvedTheme(nextResolved);
    applyTheme(nextResolved);
  }, [applyTheme]);

  return {
    theme,
    resolvedTheme,
    isDark: resolvedTheme === 'dark',
    setTheme: setThemeMode,
  };
}
