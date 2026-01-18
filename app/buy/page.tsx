'use client';

import { useState, useEffect } from 'react';

export const dynamic = 'force-dynamic';

type PlanType = 'personal' | 'premium' | 'family';
type Duration = '1m' | '3m' | '6m' | '12m';

interface Plan {
  id: string;
  type: PlanType;
  duration: Duration;
  name: string;
  days: number;
  price: number;
  priceUSDT: number;
  priceTON: number;
  priceBTC: number;
  trafficGb: number | null;
  maxIps: number;
  discount: number | null;
}

const PLAN_TYPES: { id: PlanType; name: string; icon: string; desc: string; color: string }[] = [
  { id: 'personal', name: 'Личный', icon: '👤', desc: '100 ГБ/мес', color: 'from-blue-500 to-cyan-500' },
  { id: 'premium', name: 'Премиум', icon: '⭐', desc: 'Безлимит', color: 'from-coral to-peach' },
  { id: 'family', name: 'Семейный', icon: '👨‍👩‍👧‍👦', desc: 'Безлимит + 5 IP', color: 'from-purple-500 to-pink-500' },
];

const DURATIONS: { id: Duration; name: string; days: number }[] = [
  { id: '1m', name: '1 месяц', days: 30 },
  { id: '3m', name: '3 месяца', days: 90 },
  { id: '6m', name: '6 месяцев', days: 180 },
  { id: '12m', name: '1 год', days: 365 },
];

const PLANS: Plan[] = [
  { id: 'personal_1m', type: 'personal', duration: '1m', name: 'Личный 1 мес', days: 30, price: 149, priceUSDT: 1.66, priceTON: 0.5, priceBTC: 0.000016, trafficGb: 100, maxIps: 2, discount: null },
  { id: 'personal_3m', type: 'personal', duration: '3m', name: 'Личный 3 мес', days: 90, price: 399, priceUSDT: 4.43, priceTON: 1.33, priceBTC: 0.000042, trafficGb: 100, maxIps: 2, discount: 11 },
  { id: 'personal_6m', type: 'personal', duration: '6m', name: 'Личный 6 мес', days: 180, price: 699, priceUSDT: 7.77, priceTON: 2.33, priceBTC: 0.000074, trafficGb: 100, maxIps: 2, discount: 22 },
  { id: 'personal_12m', type: 'personal', duration: '12m', name: 'Личный 1 год', days: 365, price: 1199, priceUSDT: 13.32, priceTON: 4.0, priceBTC: 0.000127, trafficGb: 100, maxIps: 2, discount: 33 },
  { id: 'premium_1m', type: 'premium', duration: '1m', name: 'Премиум 1 мес', days: 30, price: 249, priceUSDT: 2.77, priceTON: 0.83, priceBTC: 0.000026, trafficGb: null, maxIps: 2, discount: null },
  { id: 'premium_3m', type: 'premium', duration: '3m', name: 'Премиум 3 мес', days: 90, price: 649, priceUSDT: 7.21, priceTON: 2.16, priceBTC: 0.000069, trafficGb: null, maxIps: 2, discount: 13 },
  { id: 'premium_6m', type: 'premium', duration: '6m', name: 'Премиум 6 мес', days: 180, price: 1149, priceUSDT: 12.77, priceTON: 3.83, priceBTC: 0.000121, trafficGb: null, maxIps: 2, discount: 23 },
  { id: 'premium_12m', type: 'premium', duration: '12m', name: 'Премиум 1 год', days: 365, price: 1999, priceUSDT: 22.21, priceTON: 6.66, priceBTC: 0.000211, trafficGb: null, maxIps: 2, discount: 33 },
  { id: 'family_1m', type: 'family', duration: '1m', name: 'Семейный 1 мес', days: 30, price: 399, priceUSDT: 4.43, priceTON: 1.33, priceBTC: 0.000042, trafficGb: null, maxIps: 5, discount: null },
  { id: 'family_3m', type: 'family', duration: '3m', name: 'Семейный 3 мес', days: 90, price: 999, priceUSDT: 11.1, priceTON: 3.33, priceBTC: 0.000106, trafficGb: null, maxIps: 5, discount: 17 },
  { id: 'family_6m', type: 'family', duration: '6m', name: 'Семейный 6 мес', days: 180, price: 1799, priceUSDT: 19.99, priceTON: 6.0, priceBTC: 0.00019, trafficGb: null, maxIps: 5, discount: 25 },
  { id: 'family_12m', type: 'family', duration: '12m', name: 'Семейный 1 год', days: 365, price: 2999, priceUSDT: 33.32, priceTON: 10.0, priceBTC: 0.000317, trafficGb: null, maxIps: 5, discount: 37 },
];

export default function BuyPage() {
  const [selectedType, setSelectedType] = useState<PlanType>('premium');
  const [selectedDuration, setSelectedDuration] = useState<Duration>('3m');
  const [selectedMethod, setSelectedMethod] = useState<'cryptobot' | 'yukassa'>('cryptobot');
  const [selectedAsset, setSelectedAsset] = useState<'USDT' | 'TON' | 'BTC'>('USDT');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
      setUserId(window.Telegram.WebApp.initDataUnsafe.user.id);
    }
  }, []);

  const selectedPlan = PLANS.find(p => p.type === selectedType && p.duration === selectedDuration)!;
  const typeInfo = PLAN_TYPES.find(t => t.id === selectedType)!;

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
          userId, 
          method: selectedMethod, 
          asset: selectedAsset, 
          amount,
          plan: selectedPlan.id,
          planType: selectedPlan.type,
          days: selectedPlan.days,
          trafficGb: selectedPlan.trafficGb,
          maxIps: selectedPlan.maxIps,
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

  const getBasePrice = (type: PlanType) => {
    const monthPlan = PLANS.find(p => p.type === type && p.duration === '1m');
    return monthPlan?.price || 0;
  };

  return (
    <main className="min-h-screen bg-background dark:bg-surfaceDark text-textDark dark:text-white">
      <div className="px-4 py-6 pb-28">
        <h1 className="text-3xl font-bold mb-6 gradient-text animate-fade-in">
          💎 Выберите тариф
        </h1>
        
        <div className="card mb-4 card-animated stagger-1">
          <h3 className="text-lg font-bold mb-3">Тип подписки</h3>
          <div className="space-y-2">
            {PLAN_TYPES.map((type) => (
              <button 
                key={type.id} 
                onClick={() => setSelectedType(type.id)}
                className={`w-full p-4 rounded-xl border-2 text-left active:scale-[0.98] transition-all duration-200 ${
                  selectedType === type.id
                    ? 'border-coral bg-coral/10 shadow-lg shadow-coral/20'
                    : 'border-gray-200 dark:border-borderDark'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{type.icon}</span>
                    <div>
                      <div className="font-bold text-lg">{type.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{type.desc}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">от {getBasePrice(type.id)}₽</div>
                    {selectedType === type.id && <span className="text-coral text-xl">✓</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="card mb-4 card-animated stagger-2">
          <h3 className="text-lg font-bold mb-3">
            <span className={`bg-gradient-to-r ${typeInfo.color} bg-clip-text text-transparent`}>
              {typeInfo.icon} {typeInfo.name}
            </span> включает:
          </h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              ✅ {selectedPlan.trafficGb ? `${selectedPlan.trafficGb} ГБ/мес` : 'Безлимитный трафик'}
            </li>
            <li className="flex items-center gap-2">
              ✅ До {selectedPlan.maxIps} IP-адресов одновременно
            </li>
            <li className="flex items-center gap-2">✅ Скорость до 1 Гбит/с</li>
            <li className="flex items-center gap-2">✅ Без логов</li>
            <li className="flex items-center gap-2">✅ Поддержка 24/7</li>
          </ul>
        </div>

        <div className="card mb-4 card-animated stagger-3">
          <h3 className="text-lg font-bold mb-3">Период</h3>
          <div className="grid grid-cols-2 gap-2">
            {DURATIONS.map((dur) => {
              const plan = PLANS.find(p => p.type === selectedType && p.duration === dur.id)!;
              return (
                <button 
                  key={dur.id} 
                  onClick={() => setSelectedDuration(dur.id)}
                  className={`relative p-3 rounded-xl border-2 text-left active:scale-[0.97] transition-all duration-200 ${
                    selectedDuration === dur.id
                      ? 'border-coral bg-coral/10 shadow-lg shadow-coral/20'
                      : 'border-gray-200 dark:border-borderDark'
                  }`}
                >
                  {plan.discount && (
                    <span className="absolute -top-2 -right-1 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                      -{plan.discount}%
                    </span>
                  )}
                  <div className="font-semibold">{dur.name}</div>
                  <div className="text-xl font-bold gradient-text">{plan.price}₽</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="card mb-4 card-animated stagger-4">
          <h3 className="text-lg font-bold mb-3">Оплата</h3>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => setSelectedMethod('yukassa')}
              className={`p-3 rounded-xl border-2 opacity-50 ${
                selectedMethod === 'yukassa' ? 'border-coral bg-coral/10' : 'border-gray-200 dark:border-borderDark'
              }`}
            >
              <div className="text-xl mb-1">💳</div>
              <div className="font-semibold text-sm">Карта</div>
              <div className="text-xs text-gray-500">скоро</div>
            </button>
            
            <button 
              onClick={() => setSelectedMethod('cryptobot')}
              className={`p-3 rounded-xl border-2 active:scale-[0.98] transition-transform ${
                selectedMethod === 'cryptobot' ? 'border-coral bg-coral/10 shadow-lg shadow-coral/20' : 'border-gray-200 dark:border-borderDark'
              }`}
            >
              <div className="text-xl mb-1">💎</div>
              <div className="font-semibold text-sm">Крипто</div>
              <div className="text-xs text-gray-500">USDT, TON, BTC</div>
            </button>
          </div>
        </div>

        {selectedMethod === 'cryptobot' && (
          <div className="card mb-4 animate-scale-in">
            <div className="grid grid-cols-3 gap-2">
              {(['USDT', 'TON', 'BTC'] as const).map((asset) => (
                <button 
                  key={asset} 
                  onClick={() => setSelectedAsset(asset)}
                  className={`p-3 rounded-xl border-2 font-bold active:scale-[0.95] transition-all duration-200 ${
                    selectedAsset === asset
                      ? 'border-coral bg-gradient-to-br from-coral to-peach text-white shadow-lg shadow-coral/30'
                      : 'border-gray-200 dark:border-borderDark'
                  }`}
                >
                  {asset}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={`card mb-4 bg-gradient-to-br ${typeInfo.color} bg-opacity-10 border-2 border-coral/30`}>
          <div className="flex justify-between items-center">
            <div>
              <div className="font-bold">{typeInfo.icon} {typeInfo.name}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">{selectedPlan.days} дней</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold gradient-text">
                {selectedMethod === 'cryptobot' ? `${getCryptoPrice()} ${selectedAsset}` : `${selectedPlan.price}₽`}
              </div>
              {selectedPlan.discount && (
                <div className="text-xs text-green-500 font-semibold">Экономия {selectedPlan.discount}%</div>
              )}
            </div>
          </div>
        </div>

        <button 
          onClick={handlePurchase}
          disabled={loading || selectedMethod === 'yukassa' || !userId}
          className={`w-full font-bold rounded-2xl text-xl py-4 px-6 active:scale-[0.98] transition-all duration-200 ${
            selectedMethod === 'yukassa' || !userId
              ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
              : `bg-gradient-to-r ${typeInfo.color} text-white shadow-lg`
          }`}
        >
          {loading ? '⏳ Создание счёта...'
            : !userId ? '📱 Откройте через Telegram'
            : selectedMethod === 'yukassa' ? '💳 Скоро'
            : '💎 ОПЛАТИТЬ'
          }
        </button>

        <div className="text-center mt-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Вопросы?{' '}
            <a href="https://t.me/nyxion_support" target="_blank" rel="noopener noreferrer" className="text-coral hover:underline">
              Поддержка
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
