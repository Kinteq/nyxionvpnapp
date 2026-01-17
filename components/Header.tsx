'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
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
  const { theme, resolvedTheme, setTheme } = useThemeContext();
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

  const cycleTheme = () => {
    const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
    setTheme(next);
  };

  const themeLabel = theme === 'system' ? 'Авто' : theme === 'light' ? 'Светлая' : 'Тёмная';
  const themeIcon = theme === 'system' ? '🌓' : theme === 'light' ? '🌞' : '🌙';

  return (
      <header className="bg-nyxion-gradient dark:bg-gradient-to-br dark:from-blueGray-800 dark:to-blueGray-900 px-4 py-4 text-white shadow-md transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/25 border border-white/40 overflow-hidden flex items-center justify-center text-lg shadow-inner">
            {avatar.type === 'image' ? (
              <img src={avatar.value} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="font-bold">{avatar.value}</span>
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide opacity-80">Nyxion VPN</p>
            <h1 className="text-lg font-semibold leading-tight">{displayName}</h1>
          </div>
        </div>

        <button
          onClick={cycleTheme}
          className="flex items-center gap-2 px-3 py-2 bg-white/15 hover:bg-white/25 text-white rounded-lg border border-white/20 transition-colors"
        >
          <span>{themeIcon}</span>
          <span className="text-sm font-semibold">{themeLabel}</span>
          <span className="text-xs opacity-70">{resolvedTheme === 'dark' ? 'dark' : 'light'}</span>
        </button>
      </div>
       </header>
  );
}
