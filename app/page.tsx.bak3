'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import SubscriptionCard from '@/components/SubscriptionCard';
import Navigation from '@/components/Navigation';

interface SubscriptionData {
  isActive: boolean;
  expiryDate?: string;
  daysLeft?: number;
  vpnUri?: string;
  trafficGb?: number;
}

export default function Home() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

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
      // TODO: Замените на реальный API endpoint вашего бота
      const response = await fetch(`http://localhost:8080/api/subscription?userId=${uid}`);
      const data = await response.json();
      setSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setSubscription({ isActive: false });
    } finally {
      setLoading(false);
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
    <main className="min-h-screen pb-20">
      <Header />
      
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
          <p className="text-textLight">
            Ваш надежный спутник в мире интернета
          </p>
        </motion.div>

        {/* Subscription Card */}
        <SubscriptionCard subscription={subscription} />

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
            <p className="text-sm text-textLight">До 1 Гбит/с</p>
          </div>
          
          <div className="card text-center">
            <div className="text-3xl mb-2">🔒</div>
            <h3 className="font-semibold mb-1">Безопасность</h3>
            <p className="text-sm text-textLight">Шифрование AES-256</p>
          </div>
          
          <div className="card text-center">
            <div className="text-3xl mb-2">🌍</div>
            <h3 className="font-semibold mb-1">Без ограничений</h3>
            <p className="text-sm text-textLight">Безлимитный трафик</p>
          </div>
          
          <div className="card text-center">
            <div className="text-3xl mb-2">⏱</div>
            <h3 className="font-semibold mb-1">24/7 Доступ</h3>
            <p className="text-sm text-textLight">Всегда на связи</p>
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
            </button>
          </motion.div>
        )}
      </div>

      <Navigation />
    </main>
  );
}
