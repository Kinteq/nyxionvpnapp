'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export const dynamic = 'force-dynamic';

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
      className="min-h-screen pb-20 bg-[#f8f9fb] dark:bg-surfaceDark transition-colors"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
    >
      <div className="px-4 py-6">
        <h1 className="text-2xl font-bold mb-4 text-textDark dark:text-white">🔑 Мои ключи</h1>

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
            <p className="text-sm text-textLight dark:text-white mb-3">
              Истекает: {keys.expiryDate} ({keys.daysLeft} дней)
            </p>
            <div className="bg-gray-100 dark:bg-blueGray-900 rounded-lg p-3 mb-4 border border-borderLight dark:border-borderDark">
              <p className="text-xs font-mono break-all text-green-600 dark:text-green-300">
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
              className="w-full py-2 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold transition-colors"
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
            <p className="text-textLight dark:text-white mb-4">У вас нет активной подписки</p>
            <a
              href="/buy"
              className="inline-block px-6 py-2 bg-coral hover:bg-peach text-white rounded-lg font-semibold transition-colors"
            >
              💳 Купить подписку
            </a>
          </motion.div>
        )}
      </div>
    </motion.main>
  );
}
