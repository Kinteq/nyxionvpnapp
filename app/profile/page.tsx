'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface UserProfile {
  id?: number;
  firstName?: string;
  lastName?: string;
}

interface SubscriptionData {
  isActive: boolean;
  onlineCount?: number;
  status?: string;
  daysLeft?: number;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [showTerms, setShowTerms] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const user = window.Telegram.WebApp.initDataUnsafe?.user;
      setProfile(user || {});
      
      if (user?.id) {
        loadSubscription(user.id);
      }
    }
    setLoading(false);
  }, []);

  const loadSubscription = async (userId: number) => {
    try {
      const res = await fetch(`/api/subscription?userId=${userId}`);
      const data = await res.json();
      setSubscription(data);
    } catch (error) {
      console.error('Error loading subscription:', error);
    }
  };

  return (
    <main className="min-h-screen pb-28 bg-background dark:bg-surfaceDark">
      <div className="px-4 py-6">
        <h1 className="text-2xl font-bold mb-4 gradient-text animate-fade-in">
          👤 Профиль
        </h1>
        
        {loading ? (
          <div className="card text-center py-8">
            <div className="text-gray-500">Загрузка...</div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Личная информация */}
            <div className="card card-animated stagger-1">
              <h2 className="font-semibold mb-3">👋 Личная информация</h2>
              {profile?.id ? (
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-gray-500 dark:text-gray-400">ID пользователя:</span>{' '}
                    <span className="font-medium">{profile.id}</span>
                  </p>
                  {profile.firstName && (
                    <p>
                      <span className="text-gray-500 dark:text-gray-400">Имя:</span>{' '}
                      <span className="font-medium">{profile.firstName} {profile.lastName}</span>
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Откройте Mini App через Telegram для отображения вашего профиля
                </p>
              )}
            </div>

            {/* Статус подключения */}
            <div className="card card-animated stagger-2">
              <h2 className="font-semibold mb-3">📡 Статус подключения</h2>
              {subscription?.isActive ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-cardDark rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${subscription.status === 'Online' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                      <span className="text-sm font-medium">
                        {subscription.status === 'Online' ? 'Онлайн' : 'Оффлайн'}
                      </span>
                    </div>
                    {subscription.onlineCount !== undefined && subscription.onlineCount > 0 && (
                      <span className="text-xs px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full">
                        {subscription.onlineCount} подключ.
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    💡 Одна подписка работает на 2 уникальных IP-адресах одновременно. 
                    Устройства за одним роутером считаются как один IP.
                  </p>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                  Нет активной подписки
                </p>
              )}
            </div>

            {/* Пользовательское соглашение */}
            <div className="card card-animated stagger-3">
              <h2 className="font-semibold mb-3">📄 Пользовательское соглашение</h2>
              <button 
                onClick={() => setShowTerms(true)}
                className="w-full p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-left active:scale-[0.98] transition-all duration-200"
              >
                <div className="font-semibold">Условия использования</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Нажмите, чтобы прочитать</div>
              </button>
            </div>

            {/* Terms Modal */}
            {showTerms && (
              <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center animate-fade-in"
                onClick={() => setShowTerms(false)}
              >
                <div
                  className="bg-white dark:bg-surfaceDark w-full max-h-[85vh] rounded-t-3xl flex flex-col animate-fade-in-up"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex-shrink-0 bg-white dark:bg-surfaceDark border-b border-gray-200 dark:border-borderDark p-4 flex justify-between items-center rounded-t-3xl">
                    <h2 className="text-xl font-bold">📄 Пользовательское соглашение</h2>
                    <button 
                      onClick={() => setShowTerms(false)}
                      className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xl active:scale-90 transition-all duration-200"
                    >
                      ✕
                    </button>
                  </div>
                  <div 
                    className="flex-1 p-4 text-sm space-y-4 overflow-y-scroll overscroll-contain touch-pan-y"
                    style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
                  >
                    <section>
                      <h3 className="font-bold text-base mb-2">1. Условия использования</h3>
                      <p className="text-gray-600 dark:text-gray-300">Используя Nyxion VPN, вы автоматически соглашаетесь с настоящими условиями использования и обязуетесь не нарушать действующее законодательство.</p>
                    </section>
                    <section>
                      <h3 className="font-bold text-base mb-2">2. Описание сервиса</h3>
                      <p className="text-gray-600 dark:text-gray-300">Nyxion VPN — это сервис виртуальной частной сети, который обеспечивает защиту вашего интернет-соединения путём шифрования трафика.</p>
                    </section>
                    <section>
                      <h3 className="font-bold text-base mb-2">3. Тарифные планы</h3>
                      <ul className="text-gray-600 dark:text-gray-300 list-disc pl-4 space-y-1">
                        <li><strong>Личный</strong> — 100 ГБ/мес, до 2 устройств</li>
                        <li><strong>Премиум</strong> — безлимит, до 2 устройств</li>
                        <li><strong>Семейный</strong> — безлимит, до 5 устройств</li>
                      </ul>
                    </section>
                    <section>
                      <h3 className="font-bold text-base mb-2">4. Промо-период</h3>
                      <p className="text-gray-600 dark:text-gray-300">Новым пользователям может быть предоставлен бесплатный промо-период для ознакомления с сервисом.</p>
                    </section>
                    <section>
                      <h3 className="font-bold text-base mb-2">5. Конфиденциальность</h3>
                      <p className="text-gray-600 dark:text-gray-300">Мы не собираем и не храним данные о вашей онлайн-активности. Логи подключений не ведутся.</p>
                    </section>
                    <section>
                      <h3 className="font-bold text-base mb-2">6. Оплата и возврат</h3>
                      <p className="text-gray-600 dark:text-gray-300">Возврат средств возможен в течение 24 часов после оплаты, если услуга не была использована.</p>
                    </section>
                    <section>
                      <h3 className="font-bold text-base mb-2">7. Запрещённые действия</h3>
                      <p className="text-gray-600 dark:text-gray-300">Запрещается использовать сервис для незаконной деятельности и нарушения прав третьих лиц.</p>
                    </section>
                    <section>
                      <h3 className="font-bold text-base mb-2">8. Контакты</h3>
                      <p className="text-gray-600 dark:text-gray-300">Поддержка: <a href="https://t.me/nyxion_support" className="text-blue-500 underline">@nyxion_support</a></p>
                    </section>
                    <p className="text-xs text-gray-500 pt-4 border-t border-gray-200 dark:border-borderDark">Последнее обновление: январь 2026</p>
                  </div>
                </div>
              </div>
            )}

            {/* Быстрые ссылки */}
            <div className="card card-animated stagger-4">
              <h2 className="font-semibold mb-3">🔗 Быстрые ссылки</h2>
              <div className="space-y-2">
                <Link href="/guide">
                  <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 active:scale-[0.98] transition-all duration-200">
                    <div className="font-semibold">📘 Инструкция по подключению</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Пошаговое руководство</div>
                  </div>
                </Link>
                <a 
                  href="https://t.me/nyxion_support" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block p-3 bg-green-500/10 rounded-xl border border-green-500/20 active:scale-[0.98] transition-all duration-200"
                >
                  <div className="font-semibold">💬 Поддержка</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Написать в Telegram</div>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
