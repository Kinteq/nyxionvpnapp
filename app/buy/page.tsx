'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

export const dynamic = 'force-dynamic';

export default function BuyPage() {
  const [selectedMethod, setSelectedMethod] = useState<'cryptobot' | 'yukassa'>('cryptobot');
  const [selectedAsset, setSelectedAsset] = useState<'USDT' | 'TON' | 'BTC'>('USDT');
  const [loading, setLoading] = useState(false);

  // Правильные суммы для каждой криптовалюты
  const assetAmounts = {
    USDT: 0.5,
    TON: 2.0,
    BTC: 0.00004,
  };

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 123;
      const amount = assetAmounts[selectedAsset];
      
      console.log('Creating invoice...', { userId, method: selectedMethod, asset: selectedAsset, amount });
      
      const response = await fetch('/api/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          method: selectedMethod,
          asset: selectedAsset,
          amount: amount,
        }),
      });

      const data = await response.json();
      console.log('Invoice response:', data);
      
      if (data.success && data.invoiceUrl) {
        // Открываем ссылку через Telegram WebApp для правильной работы
        if (window.Telegram?.WebApp) {
          try {
            // @ts-ignore - openLink существует в runtime
            if (typeof window.Telegram.WebApp.openLink === 'function') {
              // @ts-ignore
              window.Telegram.WebApp.openLink(data.invoiceUrl);
            } else {
              window.location.href = data.invoiceUrl;
            }
          } catch (e) {
            window.location.href = data.invoiceUrl;
          }
        } else {
          window.location.href = data.invoiceUrl;
        }
      } else {
        alert('Ошибка: ' + (data.error || 'неизвестная ошибка'));
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Ошибка при создании счёта: ' + error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.main
      className="min-h-screen bg-[#f8f9fb] dark:bg-surfaceDark text-textDark dark:text-white transition-colors"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="px-4 py-6 pb-24">
        <h1 className="text-3xl font-bold mb-6 gradient-text">💎 Купить подписку</h1>
        
        {/* Пакет */}
        <motion.div
          className="card mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
        >
          <h2 className="text-2xl font-bold mb-2">VPN на 30 дней</h2>
          <p className="text-5xl font-bold gradient-text mb-4">150₽</p>
          <ul className="space-y-3 text-textDark dark:text-blueGray-100 mb-4">
            <li className="text-lg">✅ Безлимитный трафик</li>
            <li className="text-lg">✅ Высокая скорость до 1 Гбит/с</li>
            <li className="text-lg">✅ Без логов</li>
            <li className="text-lg">✅ Поддержка 24/7</li>
          </ul>
        </motion.div>

        {/* Способ оплаты */}
        <motion.div
          className="card mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: 0.05 }}
        >
          <h3 className="text-xl font-bold mb-4">Способ оплаты</h3>
          <div className="space-y-3">
            <button
              onClick={() => setSelectedMethod('cryptobot')}
              className={`w-full p-4 rounded-xl border-2 transition-all ${
                selectedMethod === 'cryptobot'
                  ? 'border-coral bg-coral/10 shadow-lg shadow-coral/30'
                  : 'border-borderLight dark:border-borderDark hover:border-coral'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <div className="font-bold text-lg">💎 CryptoBot</div>
                  <div className="text-sm text-textLight dark:text-blueGray-200">Криптовалюта (USDT, TON, BTC)</div>
                </div>
                {selectedMethod === 'cryptobot' && <span className="text-accent text-2xl">✓</span>}
              </div>
            </button>

            <button
              onClick={() => setSelectedMethod('yukassa')}
              className={`w-full p-4 rounded-xl border-2 transition-all ${
                selectedMethod === 'yukassa'
                  ? 'border-coral bg-coral/10 shadow-lg shadow-coral/30'
                  : 'border-borderLight dark:border-borderDark hover:border-coral'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <div className="font-bold text-lg">💳 ЮКасса</div>
                  <div className="text-sm text-textLight dark:text-blueGray-200">Банковские карты (скоро)</div>
                </div>
                {selectedMethod === 'yukassa' && <span className="text-accent text-2xl">✓</span>}
              </div>
            </button>
          </div>
        </motion.div>

        {/* Выбор крипто */}
        {selectedMethod === 'cryptobot' && (
          <motion.div
            className="card mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
          >
            <h3 className="text-xl font-bold mb-4">Криптовалюта</h3>
            <div className="grid grid-cols-3 gap-3">
              {(['USDT', 'TON', 'BTC'] as const).map((asset) => (
                <button
                  key={asset}
                  onClick={() => setSelectedAsset(asset)}
                  className={`p-4 rounded-xl border-2 transition-all font-bold text-lg ${
                    selectedAsset === asset
                      ? 'border-coral bg-gradient-to-br from-coral to-peach text-white shadow-lg shadow-coral/40'
                      : 'border-borderLight dark:border-borderDark hover:border-coral text-textDark dark:text-blueGray-100'
                  }`}
                >
                  {asset}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Кнопка оплаты */}
        <motion.button
          onClick={handlePurchase}
          disabled={loading || selectedMethod === 'yukassa'}
          className={`w-full font-bold rounded-2xl shadow-lg text-2xl transition-all py-5 px-8 mb-4 ${
            selectedMethod === 'yukassa'
              ? 'bg-gray-400/50 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-coral to-peach text-white hover:shadow-coral/30 disabled:opacity-60'
          }`}
          whileTap={selectedMethod !== 'yukassa' ? { scale: 0.96 } : {}}
          whileHover={selectedMethod !== 'yukassa' ? { scale: 1.03, boxShadow: '0 0 26px rgba(255, 138, 128, 0.45)' } : {}}
        >
          {loading ? (
            <span>⏳ Создание счёта...</span>
          ) : selectedMethod === 'yukassa' ? (
            <span>💳 ЮКасса (скоро)</span>
          ) : (
            <span>💎 ОПЛАТИТЬ 150₽ ({selectedAsset})</span>
          )}
        </motion.button>

        {selectedMethod === 'yukassa' && (
          <p className="text-sm text-center text-yellow-400 mt-4 px-4">
            Оплата картой будет доступна в ближайшее время
          </p>
        )}
      </div>
    </motion.main>
  );
}
