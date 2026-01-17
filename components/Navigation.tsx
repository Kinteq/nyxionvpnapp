'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useRef, useCallback } from 'react';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const navigatingRef = useRef(false);

  const navItems = [
    { href: '/', icon: '🏠', label: 'Главная' },
    { href: '/buy', icon: '💎', label: 'Купить' },
    { href: '/keys', icon: '🔑', label: 'Ключи' },
    { href: '/profile', icon: '👤', label: 'Профиль' },
  ];

  const handleNavClick = useCallback((href: string) => {
    // Предотвращаем двойные клики
    if (navigatingRef.current || pathname === href) return;
    
    navigatingRef.current = true;
    router.push(href);
    
    // Сбрасываем флаг через небольшую задержку
    setTimeout(() => {
      navigatingRef.current = false;
    }, 300);
  }, [pathname, router]);

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-surfaceDark/95 backdrop-blur-xl border-t border-gray-200/50 dark:border-borderDark/50 px-4 py-3 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]" 
      style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
    >
      <div className="flex justify-around items-center max-w-xl mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <button
              key={item.href}
              type="button"
              onClick={() => handleNavClick(item.href)}
              className={`nav-btn relative flex flex-col items-center gap-1 px-5 py-2 rounded-2xl ${
                isActive 
                  ? 'nav-btn-active bg-gradient-to-br from-coral/20 to-peach/20' 
                  : ''
              }`}
            >
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-br from-coral/15 to-peach/15 rounded-2xl border border-coral/30" />
              )}
              
              <span className={`text-2xl relative z-10 transition-transform duration-150 ${isActive ? 'scale-110' : ''}`}>
                {item.icon}
              </span>
              <span
                className={`text-xs font-semibold relative z-10 ${
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
