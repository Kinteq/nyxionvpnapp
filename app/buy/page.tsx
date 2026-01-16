'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';

export default function BuyPage() {
  const [selectedPlan, setSelectedPlan] = useState<string>('month');

  return (
    <motion.main
      className="min-h-screen pb-20"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
    >
      <Header />
      <div className="px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">💳 Купить подписку</h1>

        <motion.div
          className="card mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
        >
          <h2 className="font-semibold mb-3">Выберите тариф</h2>
          
          <div className="space-y-3">
            <button
              onClick={() => setSelectedPlan('month')}
              className={`w-full p-4 rounded-lg border-2 transition-all ${
                selectedPlan === 'month'
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-700 bg-gray-800/30'
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">1 месяц</p>
                  <p className="text-sm text-textLight">30 дней доступа</p>
                </div>
                <p className="text-xl font-bold">150₽</p>
              </div>
            </button>

            <button
              onClick={() => setSelectedPlan('year')}
              className={`w-full p-4 rounded-lg border-2 transition-all ${
                selectedPlan === 'year'
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-700 bg-gray-800/30'
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">1 год</p>
                  <p className="text-sm text-textLight">365 дней доступа</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">1500₽</p>
                  <p className="text-xs text-green-400">Экономия 300₽</p>
                </div>
              </div>
            </button>
          </div>
        </motion.div>

        <motion.div
          className="card mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: 0.1 }}
        >
          <h2 className="font-semibold mb-3">Способ оплаты</h2>
          <button className="w-full p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg font-semibold hover:shadow-lg transition-all">
            💳 Оплатить через Telegram Stars
          </button>
        </motion.div>
      </div>
      <Navigation />
    </motion.main>
  );
}
