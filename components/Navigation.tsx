'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useRef, useCallback, useEffect, useState } from 'react';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const navigatingRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const navItems = [
    { href: '/', icon: '🏠', label: 'Главная' },
    { href: '/buy', icon: '💎', label: 'Купить' },
    { href: '/keys', icon: '🔑', label: 'Ключи' },
    { href: '/profile', icon: '👤', label: 'Профиль' },
  ];

  // Синхронизируем activeIndex с pathname
  useEffect(() => {
    const idx = navItems.findIndex(item => item.href === pathname);
    setActiveIndex(idx);
    navigatingRef.current = false;
  }, [pathname]);

  const handleNavigation = useCallback((href: string, index: number) => {
    // Предотвращаем повторные клики
    if (navigatingRef.current) return;
    if (pathname === href) return;
    
    navigatingRef.current = true;
    
    // Мгновенно показываем новый активный элемент для визуального отклика
    setActiveIndex(index);
    
    // Используем setTimeout(0) чтобы дать UI обновиться перед навигацией
    setTimeout(() => {
      router.push(href);
    }, 0);
    
    // Таймаут на случай если навигация не произошла
    setTimeout(() => {
      navigatingRef.current = false;
    }, 1000);
  }, [pathname, router]);

  // Обработчик pointer events - срабатывает быстрее чем click
  const handlePointerDown = useCallback((e: React.PointerEvent, href: string, index: number) => {
    e.preventDefault();
    handleNavigation(href, index);
  }, [handleNavigation]);

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-surfaceDark/95 backdrop-blur-xl border-t border-gray-200/50 dark:border-borderDark/50 px-4 py-3 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]" 
      style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
    >
      <div className="flex justify-around items-center max-w-xl mx-auto">
        {navItems.map((item, index) => {
          const isActive = activeIndex === index;
          return (
            <button
              key={item.href}
              type="button"
              onPointerDown={(e) => handlePointerDown(e, item.href, index)}
              className={`nav-btn relative flex flex-col items-center gap-1 px-5 py-2 rounded-2xl transition-all duration-150 ${
                isActive 
                  ? 'scale-105' 
                  : 'active:scale-90'
              }`}
              style={{ touchAction: 'manipulation' }}
            >
              {/* Активный фон */}
              <div 
                className={`absolute inset-0 rounded-2xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-br from-coral/20 to-peach/20 border border-coral/30 opacity-100' 
                    : 'opacity-0'
                }`}
              />
              
              <span className={`text-2xl relative z-10 transition-transform duration-150 ${isActive ? 'scale-110' : ''}`}>
                {item.icon}
              </span>
              <span
                className={`text-xs font-semibold relative z-10 transition-colors duration-150 ${
                  isActive 
                    ? 'bg-gradient-to-r from-coral to-peach bg-clip-text text-transparent' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
