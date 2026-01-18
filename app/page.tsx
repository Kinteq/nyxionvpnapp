'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SubscriptionCard from '@/components/SubscriptionCard';
import Onboarding from '@/components/Onboarding';

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
  const router = useRouter();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [promoCode, setPromoCode] = useState('');
  const [promoStatus, setPromoStatus] = useState<PromoResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Проверяем, показывали ли onboarding
    const onboardingComplete = localStorage.getItem('nyxion_onboarding_complete');
    if (!onboardingComplete) {
      setShowOnboarding(true);
    }

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
        <div className="w-12 h-12 border-4 border-coral border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {showOnboarding && (
        <Onboarding onComplete={() => setShowOnboarding(false)} />
      )}
      
      <main className="min-h-screen pb-28 bg-background dark:bg-surfaceDark">
      <div className="px-4 py-6 space-y-6">
        {/* Welcome Section */}
        <div className="text-center animate-fade-in">
          <h1 className="text-3xl font-bold gradient-text mb-2">
            Добро пожаловать в Nyxion VPN
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Ваш надежный спутник в мире интернета
          </p>
        </div>

        {/* Subscription Card */}
        <div className="card-animated stagger-2">
          <SubscriptionCard subscription={subscription} />
        </div>

        {/* Promo Code */}
        <div className="card card-animated stagger-3">
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
            <button 
              onClick={handleActivatePromo}
              disabled={submitting || !promoCode.trim() || !userId}
              className="w-full py-3 bg-gradient-to-r from-coral to-peach rounded-xl font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-coral/20 active:scale-[0.98] transition-transform"
            >
              {submitting ? '⏳ Активация...' : '✨ Активировать'}
            </button>
            {!userId && (
              <div className="text-xs text-red-400">
                Откройте Mini App в Telegram, чтобы активировать промокод
              </div>
            )}
            {promoStatus && (
              <div
                className={`p-3 rounded-xl text-sm animate-scale-in ${
                  promoStatus.success
                    ? 'bg-green-500/10 border border-green-500/20 text-green-500'
                    : 'bg-red-500/10 border border-red-500/20 text-red-400'
                }`}
              >
                {promoStatus.success ? promoStatus.message : promoStatus.error}
              </div>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { icon: '⚡️', title: 'Высокая скорость', desc: 'До 1 Гбит/с' },
            { icon: '🔒', title: 'Безопасность', desc: 'Шифрование AES-256' },
            { icon: '🌍', title: 'Без ограничений', desc: 'Доступ ко всем сайтам' },
            { icon: '⏱', title: '24/7 Доступ', desc: 'Всегда на связи' },
          ].map((feature, i) => (
            <div key={i} className={`card text-center card-animated stagger-${i + 2}`}>
              <div className="text-3xl mb-2">{feature.icon}</div>
              <h3 className="font-semibold mb-1">{feature.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        {!subscription?.isActive && (
          <div className="card bg-nyxion-gradient text-white text-center overflow-hidden card-animated stagger-5">
            <h2 className="text-2xl font-bold mb-2">Начните прямо сейчас!</h2>
            <p className="mb-4 opacity-90">30 дней быстрого VPN всего за 149₽</p>
            <button 
              onClick={() => router.push('/buy')}
              className="w-full py-3 bg-white/90 text-navy font-bold rounded-xl shadow-lg backdrop-blur-sm active:scale-[0.98] transition-transform"
            >
              💎 Купить VPN
            </button>
          </div>
        )}
      </div>
    </main>
    </>
  );
}
