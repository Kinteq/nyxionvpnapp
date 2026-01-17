'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

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
    setIsTransitioning(true);
    const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
    
    setTimeout(() => {
      setTheme(next);
      setTimeout(() => setIsTransitioning(false), 500);
    }, 150);
  };

  const themeIcon = theme === 'system' ? '🌓' : theme === 'light' ? '☀️' : '🌙';

  const iconVariants = {
    initial: { scale: 0, rotate: -180, opacity: 0 },
    animate: { scale: 1, rotate: 0, opacity: 1 },
    exit: { scale: 0, rotate: 180, opacity: 0 }
  };

  return (
    <>
      {/* Theme transition overlay */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 pointer-events-none"
            style={{
              background: resolvedTheme === 'dark' 
                ? 'radial-gradient(circle at 90% 10%, rgba(248,249,250,0.5) 0%, transparent 50%)'
                : 'radial-gradient(circle at 90% 10%, rgba(11,18,32,0.5) 0%, transparent 50%)'
            }}
          />
        )}
      </AnimatePresence>

      <header className="bg-nyxion-gradient dark:bg-gradient-to-br dark:from-blueGray-800 dark:to-blueGray-900 px-4 py-4 text-white shadow-md transition-all duration-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-12 h-12 rounded-full bg-white/25 border border-white/40 overflow-hidden flex items-center justify-center text-lg shadow-inner"
            >
              {avatar.type === 'image' ? (
                <img src={avatar.value} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold">{avatar.value}</span>
              )}
            </motion.div>
            <div>
              <p className="text-xs uppercase tracking-wide opacity-80">Nyxion VPN</p>
              <h1 className="text-lg font-semibold leading-tight">{displayName}</h1>
            </div>
          </div>

          <motion.button
            ref={buttonRef}
            onClick={cycleTheme}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            className="theme-toggle relative"
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={theme}
                variants={iconVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ 
                  type: "spring",
                  stiffness: 300,
                  damping: 20
                }}
                className="theme-toggle-icon inline-block"
              >
                {themeIcon}
              </motion.span>
            </AnimatePresence>
            <motion.span 
              className="text-sm font-medium ml-1"
              layout
            >
              {theme === 'system' ? 'Авто' : theme === 'light' ? 'День' : 'Ночь'}
            </motion.span>
          </motion.button>
        </div>
      </header>
    </>
  );
}
