'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';

interface KeyData {
  vpnUri: string;
  expiryDate: string;
  daysLeft: number;
}

export default function KeysPage() {
  const [keys, setKeys] = useState<KeyData | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadKeys = async () => {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        const user = window.Telegram.WebApp.initDataUnsafe?.user;
        if (user?.id) {
          setUserId(user.id);
          try {
            const res = await fetch(`/api/subscription?userId=${user.id}`);
            const data = await res.json();
            if (data.isActive) {
              setKeys(data);
            }
          } catch (error) {
            console.error('Error loading keys:', error);
          }
        }
      }
      setLoading(false);
    };

    loadKeys();
  }, []);

  return (
    <motion.main
      className="min-h-screen pb-20"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
    >
      <Header />
      <div className="px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">🔑 Мои ключи</h1>

        {loading ? (
          <motion.div
            className="card text-center py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-textLight">Загрузка...</div>
          </motion.div>
        ) : keys ? (
          <motion.div
            className="card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
          >
            <h2 className="font-semibold mb-3">✅ Активная подписка</h2>
            <p className="text-sm text-textLight mb-3">
              Истекает: {keys.expiryDate} ({keys.daysLeft} дней)
            </p>
            <div className="rounded-lg border p-3 mb-4 bg-slate-50 text-slate-800 border-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700">
              <p className="text-xs font-mono break-all selection:bg-emerald-500/20 selection:text-slate-900 dark:selection:text-slate-100">
                {keys.vpnUri}
              </p>
            </div>
            <button
              onClick={() => {
                if (navigator.clipboard && keys.vpnUri) {
                  navigator.clipboard.writeText(keys.vpnUri);
                  alert('URI скопирован');
                }
              }}
              className="w-full py-2 text-sm font-semibold rounded-md inline-flex items-center justify-center gap-2 bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 transition-colors"
            >
              📋 Копировать URI
            </button>
          </motion.div>
        ) : (
          <motion.div
            className="card text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-textLight mb-4">У вас нет активной подписки</p>
            <a
              href="/buy"
              className="inline-block px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold transition-colors"
            >
              💳 Купить подписку
            </a>
          </motion.div>
        )}
      </div>
      <Navigation />
    </motion.main>
  );
}
