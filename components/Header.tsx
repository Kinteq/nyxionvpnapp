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
  const [circleRadius, setCircleRadius] = useState(0);
  const [circlePos, setCirclePos] = useState({ x: 0, y: 0 });
  const [pendingTheme, setPendingTheme] = useState<'light' | 'dark' | 'system' | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const animationFrameRef = useRef<number>(0);

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

  // Рассчитываем максимальный радиус для покрытия экрана
  const maxRadius = useMemo(() => {
    if (typeof window === 'undefined') return 2000;
    return Math.sqrt(Math.pow(window.innerWidth, 2) + Math.pow(window.innerHeight, 2)) * 1.2;
  }, []);

  const cycleTheme = useCallback(() => {
    if (isAnimating) return;
    
    const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
    
    // Позиция кнопки
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCirclePos({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    }
    
    setPendingTheme(next);
    setCircleRadius(0);
    setIsAnimating(true);
    
    // Анимируем радиус
    let start: number | null = null;
    const duration = 500; // ms
    
    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      
      // Easing - ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCircleRadius(eased * maxRadius);
      
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Анимация закончена, применяем тему
        setTheme(next);
        
        // Небольшая задержка перед скрытием overlay
        setTimeout(() => {
          setIsAnimating(false);
          setPendingTheme(null);
          setCircleRadius(0);
        }, 50);
      }
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [theme, setTheme, isAnimating, maxRadius]);

  // Cleanup animation frame
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const themeIcon = theme === 'system' ? '🌓' : theme === 'light' ? '☀️' : '🌙';
  
  // Определяем цвет overlay - это будет цвет НОВОЙ темы
  const overlayColor = useMemo(() => {
    if (!pendingTheme) return '#0B1220';
    const nextResolved = pendingTheme === 'system' 
      ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : pendingTheme;
    return nextResolved === 'dark' ? '#0B1220' : '#F8FAFC';
  }, [pendingTheme]);

  return (
    <>
      {/* Theme transition overlay */}
      {isAnimating && (
        <div
          className="fixed inset-0 z-[9999] pointer-events-none"
          style={{
            background: overlayColor,
            clipPath: `circle(${circleRadius}px at ${circlePos.x}px ${circlePos.y}px)`,
            willChange: 'clip-path',
          }}
        />
      )}

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
            className="w-11 h-11 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-xl shadow-md backdrop-blur-sm active:scale-90 transition-transform duration-100 disabled:opacity-70"
            aria-label="Переключить тему"
          >
            <span className="select-none">{themeIcon}</span>
          </button>
        </div>
      </header>
    </>
  );
}
