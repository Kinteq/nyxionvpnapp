'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useThemeContext } from './ThemeProvider';

type TgUser = {
  id?: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
};

interface HeaderProps {
  user?: TgUser | null;
}

export default function Header({ user }: HeaderProps) {
  const { theme, setTheme } = useThemeContext();
  const [internalUser, setInternalUser] = useState<TgUser | null>(user ?? null);

  useEffect(() => {
    if (user) {
      setInternalUser(user);
      return;
    }

    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user) {
      const tgUser = window.Telegram.WebApp.initDataUnsafe.user as TgUser;
      setInternalUser(tgUser);
    }
  }, [user]);

  const displayName = useMemo(() => {
    if (!internalUser) return 'Гость';
    if (internalUser.username) return `@${internalUser.username}`;
    const fullName = [internalUser.first_name, internalUser.last_name].filter(Boolean).join(' ');
    return fullName || 'Гость';
  }, [internalUser]);

  const avatar = useMemo(() => {
    if (internalUser?.photo_url) return { type: 'image' as const, value: internalUser.photo_url };
    const initials = [internalUser?.first_name?.[0], internalUser?.last_name?.[0]]
      .filter(Boolean)
      .join('')
      .slice(0, 2)
      .toUpperCase();
    return { type: 'text' as const, value: initials || '🙂' };
  }, [internalUser]);

  const cycleTheme = useCallback(() => {
    const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
    setTheme(next);
  }, [theme, setTheme]);

  const themeIcon = theme === 'system' ? '🌓' : theme === 'light' ? '☀️' : '🌙';

  return (
    <header className="bg-nyxion-gradient px-4 py-4 text-white shadow-lg sticky top-0 z-50">
      <div className="flex items-center justify-between max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/25 border border-white/40 overflow-hidden flex items-center justify-center text-lg shadow-inner backdrop-blur-sm">
            {avatar.type === 'image' ? (
              <img src={avatar.value} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-bold">{avatar.value}</span>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-white/70 text-xs font-medium">Добро пожаловать</span>
            <span className="font-bold text-white text-base truncate max-w-[140px]">{displayName}</span>
          </div>
        </div>

        <button
          onClick={cycleTheme}
          className="w-11 h-11 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-xl shadow-md backdrop-blur-sm active:scale-90 transition-transform duration-100"
          aria-label="Переключить тему"
        >
          <span className="select-none">{themeIcon}</span>
        </button>
      </div>
    </header>
  );
}
