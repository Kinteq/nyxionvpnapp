'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } }
};

export default function Home() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [promoCode, setPromoCode] = useState('');
  const [promoStatus, setPromoStatus] = useState<PromoResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      
      const user = tg.initDataUnsafe?.user;
      if (user) {
        setUserId(user.id);
        fetchSubscription(user.id);
      } else {
        setLoading(false);
      }
      
      tg.setHeaderColor('#FF9A8B');
    } else {
      setLoading(false);
    }
  }, []);

  const fetchSubscription = async (uid: number) => {
    try {
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-coral/20 to-peach/20 dark:from-surfaceDark dark:to-cardDark">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-coral border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <motion.main 
      className="min-h-screen pb-28 bg-background dark:bg-surfaceDark"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="px-4 py-6 space-y-6">
        {/* Welcome Section */}
        <motion.div variants={itemVariants} className="text-center">
          <h1 className="text-3xl font-bold gradient-text mb-2">
            Добро пожаловать в Nyxion VPN
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Ваш надежный спутник в мире интернета
          </p>
        </motion.div>

        {/* Subscription Card */}
        <motion.div variants={itemVariants}>
          <SubscriptionCard subscription={subscription} />
        </motion.div>

        {/* Promo Code */}
        <motion.div variants={itemVariants} className="card">
          <h2 className="font-semibold mb-3">🎁 Промокод</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">
            Есть промокод? Активируйте его здесь:
          </p>
          <div className="space-y-3">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="Введите промокод"
              className="input-base"
              disabled={submitting}
            />
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleActivatePromo}
              disabled={submitting || !promoCode.trim() || !userId}
              className="w-full py-3 bg-gradient-to-r from-coral to-peach rounded-xl font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-coral/20"
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
                className={`p-3 rounded-xl text-sm ${
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
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
          {[
            { icon: '⚡️', title: 'Высокая скорость', desc: 'До 1 Гбит/с' },
            { icon: '🔒', title: 'Безопасность', desc: 'Шифрование AES-256' },
            { icon: '🌍', title: 'Без ограничений', desc: 'Безлимитный трафик' },
            { icon: '⏱', title: '24/7 Доступ', desc: 'Всегда на связи' },
          ].map((feature, i) => (
            <motion.div 
              key={i}
              className="card text-center"
              whileHover={{ scale: 1.03, y: -2 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-3xl mb-2">{feature.icon}</div>
              <h3 className="font-semibold mb-1">{feature.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        {!subscription?.isActive && (
          <motion.div
            variants={itemVariants}
            className="card bg-nyxion-gradient text-white text-center overflow-hidden"
          >
            <h2 className="text-2xl font-bold mb-2">Начните прямо сейчас!</h2>
            <p className="mb-4 opacity-90">30 дней безлимитного VPN всего за 150₽</p>
            <motion.button 
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push('/buy')}
              className="w-full py-3 bg-white/90 text-navy font-bold rounded-xl shadow-lg backdrop-blur-sm"
            >
              💎 Купить VPN
            </motion.button>
          </motion.div>
        )}
      </div>
    </motion.main>
  );
}
