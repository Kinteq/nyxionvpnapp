'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
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
  const [isAnimating, setIsAnimating] = useState(false);
  const [overlayTheme, setOverlayTheme] = useState<'light' | 'dark'>('light');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [circlePos, setCirclePos] = useState({ x: 0, y: 0 });

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
    if (isAnimating) return;
    
    const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
    const nextResolved = next === 'system' 
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : next;
    
    // Позиция кнопки для центра круга
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCirclePos({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    }
    
    // Overlay будет цвета НОВОЙ темы (та, на которую переключаемся)
    setOverlayTheme(nextResolved);
    setIsAnimating(true);
    
    // Сначала запускаем анимацию, потом меняем тему когда круг достаточно большой
    setTimeout(() => {
      setTheme(next);
    }, 250);
    
    // Заканчиваем анимацию
    setTimeout(() => {
      setIsAnimating(false);
    }, 600);
  }, [theme, setTheme, isAnimating]);

  const themeIcon = theme === 'system' ? '🌓' : theme === 'light' ? '☀️' : '🌙';
  
  // Рассчитываем радиус для покрытия всего экрана
  const maxRadius = typeof window !== 'undefined' 
    ? Math.sqrt(Math.pow(window.innerWidth, 2) + Math.pow(window.innerHeight, 2)) * 1.2
    : 2000;

  return (
    <>
      {/* Theme transition overlay with circular reveal */}
      {isAnimating && (
        <div
          className="fixed inset-0 z-[9999] pointer-events-none"
          style={{
            background: overlayTheme === 'dark' ? '#0B1220' : '#F8FAFC',
            clipPath: `circle(0% at ${circlePos.x}px ${circlePos.y}px)`,
            animation: 'themeReveal 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards',
          }}
        />
      )}
      
      <style jsx>{`
        @keyframes themeReveal {
          0% {
            clip-path: circle(0% at ${circlePos.x}px ${circlePos.y}px);
          }
          100% {
            clip-path: circle(${maxRadius}px at ${circlePos.x}px ${circlePos.y}px);
          }
        }
      `}</style>

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
            ref={buttonRef}
            onClick={cycleTheme}
            disabled={isAnimating}
            className="w-11 h-11 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-xl shadow-md backdrop-blur-sm disabled:opacity-70"
            aria-label="Переключить тему"
          >
            <span className="select-none">{themeIcon}</span>
          </button>
        </div>
      </header>
    </>
  );
}
