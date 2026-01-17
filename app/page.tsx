'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import SubscriptionCard from '@/components/SubscriptionCard';

export const dynamic = 'force-dynamic';

interface SubscriptionData {
  isActive: boolean;
  expiryDate?: string;
  daysLeft?: number;
  vpnUri?: string;
  trafficGb?: number;
}

interface PromoResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export default function Home() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [promoCode, setPromoCode] = useState('');
  const [promoStatus, setPromoStatus] = useState<PromoResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Инициализация Telegram Web App
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      
      // Получаем данные пользователя
      const user = tg.initDataUnsafe?.user;
      if (user) {
        setUserId(user.id);
        fetchSubscription(user.id);
      }
      
      // Настройка темы
      tg.setHeaderColor('#FF9A8B');
      tg.setBackgroundColor('#F8F9FA');
    }
  }, []);

  const fetchSubscription = async (uid: number) => {
    try {
      // ИСПРАВЛЕНО: Запрос через Vercel API route вместо прямого обращения к VPS
      const response = await fetch(`/api/subscription?userId=${uid}`);
      const data = await response.json();
      setSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setSubscription({ isActive: false });
    } finally {
      setLoading(false);
    }
  };

  const handleActivatePromo = async () => {
    if (!userId || !promoCode.trim()) {
      setPromoStatus({ success: false, error: 'Введите промокод' });
      return;
    }

    setSubmitting(true);
    setPromoStatus(null);

    try {
      const response = await fetch('/api/activate-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          promoCode: promoCode.trim().toUpperCase(),
        }),
      });

      const data = await response.json();
      setPromoStatus(data);

      if (data.success) {
        setPromoCode('');
        fetchSubscription(userId);
      }
    } catch (error) {
      setPromoStatus({ success: false, error: 'Ошибка сети' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-nyxion-gradient">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-white border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <main className="min-h-screen pb-20 bg-[#f8f9fb] dark:bg-surfaceDark transition-colors">
      <div className="px-4 py-6 space-y-6">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-3xl font-bold gradient-text mb-2">
            Добро пожаловать в Nyxion VPN
          </h1>
          <p className="text-textLight dark:text-white">
            Ваш надежный спутник в мире интернета
          </p>
        </motion.div>

        {/* Subscription Card */}
        <SubscriptionCard subscription={subscription} />

        {/* Promo Code */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="card"
        >
          <h2 className="font-semibold mb-3">🎁 Промокод</h2>
          <p className="text-textLight dark:text-white text-sm mb-3">Есть промокод? Активируйте его здесь:</p>
          <div className="space-y-3">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="Введите промокод"
              className="w-full px-4 py-3 bg-white dark:bg-blueGray-900 border border-borderLight dark:border-borderDark rounded-lg focus:border-coral focus:outline-none transition-colors text-textDark dark:text-white placeholder-gray-400"
              disabled={submitting}
            />
            <motion.button whileTap={{ scale: 0.95 }}
              onClick={handleActivatePromo}
              disabled={submitting || !promoCode.trim() || !userId}
              className="w-full py-3 bg-gradient-to-r from-coral to-peach rounded-lg font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-coral/30 transition-all"
            >
              {submitting ? '⏳ Активация...' : '✨ Активировать'}
            </motion.button>
            {!userId && (
              <div className="text-xs text-red-400">
                Откройте Mini App в Telegram, чтобы активировать промокод
              </div>
            )}
            {promoStatus && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-lg text-sm ${
                  promoStatus.success
                    ? 'bg-green-500/10 border border-green-500/20 text-green-500'
                    : 'bg-red-500/10 border border-red-500/20 text-red-400'
                }`}
              >
                {promoStatus.success ? promoStatus.message : promoStatus.error}
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 gap-4"
        >
          <div className="card text-center">
            <div className="text-3xl mb-2">⚡️</div>
            <h3 className="font-semibold mb-1">Высокая скорость</h3>
            <p className="text-sm text-textLight dark:text-white">До 1 Гбит/с</p>
          </div>
          
          <div className="card text-center">
            <div className="text-3xl mb-2">🔒</div>
            <h3 className="font-semibold mb-1">Безопасность</h3>
            <p className="text-sm text-textLight dark:text-white">Шифрование AES-256</p>
          </div>
          
          <div className="card text-center">
            <div className="text-3xl mb-2">🌍</div>
            <h3 className="font-semibold mb-1">Без ограничений</h3>
            <p className="text-sm text-textLight dark:text-white">Безлимитный трафик</p>
          </div>
          
          <div className="card text-center">
            <div className="text-3xl mb-2">⏱</div>
            <h3 className="font-semibold mb-1">24/7 Доступ</h3>
            <p className="text-sm text-textLight dark:text-white">Всегда на связи</p>
          </div>
        </motion.div>

        {/* CTA */}
        {!subscription?.isActive && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card bg-nyxion-gradient text-white text-center"
          >
            <h2 className="text-2xl font-bold mb-2">Начните прямо сейчас!</h2>
            <p className="mb-4 opacity-90">30 дней безлимитного VPN всего за 150₽</p>
            <button className="btn-secondary w-full">
              💎 Купить VPN
            </motion.button>
          </motion.div>
        )}
      </div>

    </main>
  );
}
