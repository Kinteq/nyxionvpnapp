'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const dynamic = 'force-dynamic';

const PLANS = [
  { id: 'month1', name: '1 месяц', days: 30, price: 150, priceUSDT: 1.93, priceTON: 1.11, priceBTC: 0.00002, popular: false, discount: null },
  { id: 'month3', name: '3 месяца', days: 90, price: 390, priceUSDT: 5.01, priceTON: 2.89, priceBTC: 0.000053, popular: true, discount: 13 },
  { id: 'month6', name: '6 месяцев', days: 180, price: 690, priceUSDT: 8.86, priceTON: 5.11, priceBTC: 0.000093, popular: false, discount: 23 },
  { id: 'year1', name: '1 год', days: 365, price: 1190, priceUSDT: 0.5, priceTON: 8.81, priceBTC: 0.00016, popular: false, discount: 34 },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } }
};

export default function BuyPage() {
  const [selectedPlan, setSelectedPlan] = useState(PLANS[1]);
  const [selectedMethod, setSelectedMethod] = useState<'cryptobot' | 'yukassa'>('cryptobot');
  const [selectedAsset, setSelectedAsset] = useState<'USDT' | 'TON' | 'BTC'>('USDT');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
      setUserId(window.Telegram.WebApp.initDataUnsafe.user.id);
    }
  }, []);

  const getCryptoPrice = () => {
    switch (selectedAsset) {
      case 'USDT': return selectedPlan.priceUSDT;
      case 'TON': return selectedPlan.priceTON;
      case 'BTC': return selectedPlan.priceBTC;
      default: return selectedPlan.priceUSDT;
    }
  };

  const handlePurchase = async () => {
    if (!userId) { alert('Откройте приложение через Telegram'); return; }
    setLoading(true);
    try {
      const amount = getCryptoPrice();
      const response = await fetch('/api/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId, method: selectedMethod, asset: selectedAsset, amount,
          plan: selectedPlan.id, days: selectedPlan.days,
        }),
      });
      const data = await response.json();
      if (data.success && data.invoiceUrl) {
        if (window.Telegram?.WebApp?.openLink) {
          window.Telegram.WebApp.openLink(data.invoiceUrl);
        } else { 
          window.location.href = data.invoiceUrl; 
        }
      } else { 
        alert('Ошибка: ' + (data.error || 'неизвестная ошибка')); 
      }
    } catch (error) { 
      alert('Ошибка при создании счёта: ' + error); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <motion.main
      className="min-h-screen bg-background dark:bg-surfaceDark text-textDark dark:text-white"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="px-4 py-6 pb-28">
        <motion.h1 variants={itemVariants} className="text-3xl font-bold mb-6 gradient-text">
          💎 Купить подписку
        </motion.h1>
        
        {/* Что входит */}
        <motion.div variants={itemVariants} className="card mb-6">
          <h2 className="text-xl font-bold mb-3">Что входит в подписку:</h2>
          <ul className="space-y-2">
            {['✅ Безлимитный трафик', '✅ Скорость до 1 Гбит/с', '✅ 2 устройства', '✅ Без логов', '✅ Поддержка 24/7'].map((item, i) => (
              <motion.li 
                key={i} 
                className="flex items-center gap-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
              >
                {item}
              </motion.li>
            ))}
          </ul>
        </motion.div>

        {/* Выбор периода */}
        <motion.div variants={itemVariants} className="card mb-6">
          <h3 className="text-xl font-bold mb-4">Выберите период</h3>
          <div className="grid grid-cols-2 gap-3">
            {PLANS.map((plan) => (
              <motion.button 
                key={plan.id} 
                onClick={() => setSelectedPlan(plan)}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className={`relative p-4 rounded-xl border-2 text-left transition-colors ${
                  selectedPlan.id === plan.id
                    ? 'border-coral bg-coral/10 shadow-lg shadow-coral/20'
                    : 'border-gray-200 dark:border-borderDark hover:border-coral/50'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-2 -right-2 bg-gradient-to-r from-coral to-peach text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                    🔥 Хит
                  </span>
                )}
                {plan.discount && (
                  <span className="absolute -top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                    -{plan.discount}%
                  </span>
                )}
                <div className="font-bold text-lg">{plan.name}</div>
                <div className="text-2xl font-bold gradient-text">{plan.price}₽</div>
                {plan.discount && (
                  <div className="text-xs text-gray-400 line-through">{Math.round(150 * (plan.days / 30))}₽</div>
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Способ оплаты */}
        <motion.div variants={itemVariants} className="card mb-6">
          <h3 className="text-xl font-bold mb-4">Способ оплаты</h3>
          <div className="space-y-3">
            <motion.button 
              onClick={() => setSelectedMethod('yukassa')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full p-4 rounded-xl border-2 transition-colors opacity-60 ${
                selectedMethod === 'yukassa' 
                  ? 'border-coral bg-coral/10' 
                  : 'border-gray-200 dark:border-borderDark'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <div className="font-bold text-lg">💳 ЮКасса</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Банковские карты (скоро)</div>
                </div>
                {selectedMethod === 'yukassa' && <span className="text-coral text-2xl">✓</span>}
              </div>
            </motion.button>
            
            <motion.button 
              onClick={() => setSelectedMethod('cryptobot')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full p-4 rounded-xl border-2 transition-colors ${
                selectedMethod === 'cryptobot' 
                  ? 'border-coral bg-coral/10 shadow-lg shadow-coral/20' 
                  : 'border-gray-200 dark:border-borderDark hover:border-coral/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <div className="font-bold text-lg">💎 CryptoBot</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Криптовалюта (USDT, TON, BTC)</div>
                </div>
                {selectedMethod === 'cryptobot' && <span className="text-coral text-2xl">✓</span>}
              </div>
            </motion.button>
          </div>
        </motion.div>

        {/* Выбор криптовалюты */}
        <AnimatePresence>
          {selectedMethod === 'cryptobot' && (
            <motion.div 
              className="card mb-6"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-xl font-bold mb-4">Криптовалюта</h3>
              <div className="grid grid-cols-3 gap-3">
                {(['USDT', 'TON', 'BTC'] as const).map((asset) => (
                  <motion.button 
                    key={asset} 
                    onClick={() => setSelectedAsset(asset)}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className={`p-4 rounded-xl border-2 font-bold text-lg transition-colors ${
                      selectedAsset === asset
                        ? 'border-coral bg-gradient-to-br from-coral to-peach text-white shadow-lg shadow-coral/30'
                        : 'border-gray-200 dark:border-borderDark hover:border-coral/50'
                    }`}
                  >
                    {asset}
                  </motion.button>
                ))}
              </div>
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-3">
                К оплате: <span className="font-bold text-coral">{getCryptoPrice()} {selectedAsset}</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Итого */}
        <motion.div 
          variants={itemVariants}
          className="card mb-6 bg-gradient-to-br from-coral/10 to-peach/10 border-coral/30"
        >
          <div className="flex justify-between items-center">
            <div>
              <div className="text-lg font-bold">{selectedPlan.name}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{selectedPlan.days} дней</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold gradient-text">
                {selectedMethod === 'cryptobot' ? `${getCryptoPrice()} ${selectedAsset}` : `${selectedPlan.price}₽`}
              </div>
              {selectedPlan.discount && (
                <div className="text-sm text-green-500 font-semibold">Экономия {selectedPlan.discount}%</div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Кнопка оплаты */}
        <motion.button 
          onClick={handlePurchase}
          disabled={loading || selectedMethod === 'yukassa' || !userId}
          whileHover={selectedMethod !== 'yukassa' && userId ? { scale: 1.02, boxShadow: '0 20px 40px -10px rgba(255, 154, 139, 0.5)' } : {}}
          whileTap={selectedMethod !== 'yukassa' && userId ? { scale: 0.98 } : {}}
          className={`w-full font-bold rounded-2xl text-xl py-5 px-8 mb-4 transition-all ${
            selectedMethod === 'yukassa' || !userId
              ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-coral to-peach text-white shadow-lg shadow-coral/30'
          }`}
        >
          {loading ? '⏳ Создание счёта...'
            : !userId ? '📱 Откройте через Telegram'
            : selectedMethod === 'yukassa' ? '💳 ЮКасса (скоро)'
            : '💎 ОПЛАТИТЬ'
          }
        </motion.button>

        {selectedMethod === 'yukassa' && (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-center text-yellow-500 mt-4 px-4"
          >
            Оплата картой будет доступна в ближайшее время
          </motion.p>
        )}

        <div className="text-center mt-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Возникли вопросы?{' '}
            <a href="https://t.me/nyxion_support" target="_blank" rel="noopener noreferrer" className="text-coral hover:underline">
              Напишите в поддержку
            </a>
          </p>
        </div>
      </div>
    </motion.main>
  );
}
