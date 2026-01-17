'use client';

import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { href: '/', icon: '🏠', label: 'Главная' },
    { href: '/buy', icon: '💎', label: 'Купить' },
    { href: '/keys', icon: '🔑', label: 'Ключи' },
    { href: '/profile', icon: '👤', label: 'Профиль' },
  ];

  const handleNavClick = (href: string) => {
    if (pathname !== href) {
      router.push(href);
    }
  };

  return (
    <motion.nav 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-surfaceDark/95 backdrop-blur-xl border-t border-gray-200/50 dark:border-borderDark/50 px-4 py-3 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]"
    >
      <div className="flex justify-around items-center max-w-xl mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <motion.button
              key={item.href}
              onClick={() => handleNavClick(item.href)}
              whileHover={{ scale: 1.08, y: -2 }}
              whileTap={{ scale: 0.92 }}
              className={`relative flex flex-col items-center gap-1 px-5 py-2 rounded-2xl transition-all duration-300 ${
                isActive 
                  ? 'bg-gradient-to-br from-coral/20 to-peach/20 shadow-lg shadow-coral/20' 
                  : 'hover:bg-gray-100/80 dark:hover:bg-white/5'
              }`}
            >
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute inset-0 bg-gradient-to-br from-coral/15 to-peach/15 rounded-2xl border border-coral/30"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              
              <motion.span 
                className="text-2xl relative z-10"
                animate={isActive ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                {item.icon}
              </motion.span>
              <span
                className={`text-xs font-semibold relative z-10 transition-colors duration-300 ${
                  isActive 
                    ? 'bg-gradient-to-r from-coral to-peach bg-clip-text text-transparent' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.nav>
  );
}
