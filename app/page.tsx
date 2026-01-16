'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface Subscription {
  isActive: boolean;
  expiryDate?: string;
  daysLeft?: number;
  vpnUri?: string;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

export default function HomePage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    const initializeUser = async () => {
      try {
        // Получаем данные Telegram
        if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
          const user = window.Telegram.WebApp.initDataUnsafe?.user;
          if (user?.id) {
            setUserId(user.id);
            // Загружаем подписку пользователя
            const res = await fetch(`/api/subscription?userId=${user.id}`);
            const data = await res.json();
            setSubscription(data);
          }
        }
      } catch (error) {
        console.error('Error loading subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeUser();
  }, []);

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-6 pb-24"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div className="max-w-md mx-auto px-4" variants={container} initial="hidden" animate="show">
        {/* Заголовок */}
        <motion.div variants={item} className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Nyxion VPN
          </h1>
          <p className="text-gray-600 text-sm mt-2">Безопасный и быстрый VPN</p>
        </motion.div>

        {/* Статус подписки */}
        {loading ? (
          <motion.div variants={item} className="bg-white rounded-xl shadow-sm p-6 mb-6 text-center">
            <div className="animate-pulse h-20 bg-gray-200 rounded-lg"></div>
          </motion.div>
        ) : subscription?.isActive ? (
          <motion.div
            variants={item}
            className={`rounded-xl shadow-md p-6 mb-6 border-2 ${
              subscription.trafficGb > 99999
                ? 'bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 border-yellow-300'
                : 'bg-gradient-to-br from-green-50 to-blue-50 border-green-200'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className={`text-sm font-semibold ${
                subscription.trafficGb > 99999 ? 'text-yellow-700' : 'text-green-700'
              }`}>
                {subscription.trafficGb > 99999 ? '👑 Безлимитная подписка' : '✅ Подписка активна'}
              </span>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="text-2xl"
              >
                {subscription.trafficGb > 99999 ? '✨' : '🔒'}
              </motion.div>
            </div>
            
            {subscription.trafficGb > 99999 ? (
              <div className="mb-4 p-4 bg-gradient-to-r from-yellow-100 to-amber-100 rounded-lg border border-yellow-300">
                <p className="text-center text-yellow-800 font-bold text-lg mb-1">∞ Безлимит</p>
                <p className="text-center text-yellow-700 text-xs">Неограниченный трафик и доступ</p>
              </div>
            ) : (
              <>
                <p className="text-gray-700 text-sm mb-3">
                  <strong>Истекает:</strong> {subscription.expiryDate}
                </p>
                <p className="text-gray-700 text-sm mb-4">
                  <strong>Осталось:</strong> {subscription.daysLeft} дней
                </p>
              </>
            )}
            
            <div className={`rounded-lg p-3 mb-4 ${
              subscription.trafficGb > 99999 ? 'bg-yellow-100' : 'bg-green-100'
            }`}>
              <p className={`text-xs font-mono break-all ${
                subscription.trafficGb > 99999 ? 'text-yellow-800' : 'text-green-800'
              }`}>
                {subscription.vpnUri}
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full font-semibold py-2 px-4 rounded-lg transition-colors ${
                subscription.trafficGb > 99999
                  ? 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
              onClick={() => {
                if (navigator.clipboard && subscription.vpnUri) {
                  navigator.clipboard.writeText(subscription.vpnUri);
                  alert('URI скопирован');
                }
              }}
            >
              📋 Копировать URI
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            variants={item}
            className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl shadow-md p-6 mb-6 border-2 border-orange-200"
          >
            <div className="flex items-center mb-4">
              <span className="text-3xl mr-3">⏱️</span>
              <span className="text-sm font-semibold text-orange-700">Подписка не активна</span>
            </div>
            <p className="text-gray-700 text-sm mb-6">Пора покупать VPN доступ и защитить свои данные!</p>
          </motion.div>
        )}

        {/* Меню кнопок */}
        <motion.div variants={item} className="grid grid-cols-2 gap-3 mb-6">
          {/* Купить */}
          <Link href="/buy">
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)' }}
              whileTap={{ scale: 0.95 }}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-4 rounded-xl shadow-lg transition-all text-center text-lg"
            >
              🛒<br />
              Купить
            </motion.button>
          </Link>

          {/* Мои ключи */}
          <Link href="/keys">
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 10px 25px rgba(34, 197, 94, 0.3)' }}
              whileTap={{ scale: 0.95 }}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-4 px-4 rounded-xl shadow-lg transition-all text-center text-lg"
            >
              🔑<br />
              Мои ключи
            </motion.button>
          </Link>

          {/* Инструкция */}
          <Link href="/guide">
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 10px 25px rgba(168, 85, 247, 0.3)' }}
              whileTap={{ scale: 0.95 }}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold py-4 px-4 rounded-xl shadow-lg transition-all text-center text-lg"
            >
              📘<br />
              Инструкция
            </motion.button>
          </Link>

          {/* Профиль */}
          <Link href="/profile">
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 10px 25px rgba(236, 72, 153, 0.3)' }}
              whileTap={{ scale: 0.95 }}
              className="w-full bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 text-white font-bold py-4 px-4 rounded-xl shadow-lg transition-all text-center text-lg"
            >
              👤<br />
              Профиль
            </motion.button>
          </Link>
        </motion.div>

        {/* Статистика (если есть подписка) */}
        {subscription?.isActive && (
          <motion.div
            variants={item}
            className="bg-white rounded-xl shadow-sm p-4 border border-gray-200 text-center text-sm text-gray-600"
          >
            <p className="mb-2">Благодарим за использование Nyxion VPN! 🚀</p>
            <p>Если есть вопросы, свяжитесь с поддержкой в профиле.</p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
