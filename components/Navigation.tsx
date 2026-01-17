'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', icon: '🏠', label: 'Главная' },
    { href: '/buy', icon: '💎', label: 'Купить' },
    { href: '/keys', icon: '🔑', label: 'Ключи' },
    { href: '/profile', icon: '👤', label: 'Профиль' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-surfaceDark border-t border-gray-200 dark:border-borderDark px-4 py-3 safe-area-inset-bottom transition-colors">
      <div className="flex justify-around items-center max-w-2xl mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                isActive ? 'bg-card-gradient dark:bg-gradient-to-br dark:from-coral/20 dark:to-peach/20' : ''
              }`}
            >
              <span className="text-2xl">{item.icon}</span>
              <span
                className={`text-xs font-medium ${
                  isActive ? 'gradient-text dark:text-coral' : 'text-textLight dark:text-blueGray-300'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
