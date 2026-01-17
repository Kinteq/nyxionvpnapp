'use client';

import { useEffect, useMemo, useState } from 'react';
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
      setTimeout(() => setIsTransitioning(false), 600);
    }, 100);
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
            initial={{ opacity: 0, scale: 1.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-0 z-[9999] pointer-events-none"
            style={{
              background: resolvedTheme === 'light' 
                ? 'radial-gradient(circle at 85% 8%, rgba(11,18,32,0.4) 0%, transparent 60%)'
                : 'radial-gradient(circle at 85% 8%, rgba(255,255,255,0.3) 0%, transparent 60%)'
            }}
          />
        )}
      </AnimatePresence>

      <header className="bg-nyxion-gradient px-4 py-4 text-white shadow-lg sticky top-0 z-50">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-12 h-12 rounded-full bg-white/25 border border-white/40 overflow-hidden flex items-center justify-center text-lg shadow-inner backdrop-blur-sm"
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
            onClick={cycleTheme}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 shadow-lg"
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
                className="text-xl inline-block"
              >
                {themeIcon}
              </motion.span>
            </AnimatePresence>
            <motion.span 
              className="text-sm font-medium"
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
