'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const dynamic = 'force-dynamic';

interface UserProfile {
  id?: number;
  firstName?: string;
  lastName?: string;
}

interface Device {
  device_id: string;
  ip: string;
  first_seen: string;
  last_seen: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const user = window.Telegram.WebApp.initDataUnsafe?.user;
      setProfile(user || {});
      
      // Загрузка списка устройств
      if (user?.id) {
        loadDevices(user.id);
      }
    }
    setLoading(false);
  }, []);

  const loadDevices = async (userId: number) => {
    setLoadingDevices(true);
    try {
      const res = await fetch(`/api/devices?userId=${userId}`);
      const data = await res.json();
      setDevices(data.devices || []);
    } catch (error) {
      console.error('Error loading devices:', error);
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    if (!profile?.id || !confirm('Удалить это устройство?')) return;

    try {
      const res = await fetch('/api/devices', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id, deviceId }),
      });

      const data = await res.json();
      if (data.success) {
        loadDevices(profile.id);
        alert('Устройство удалено');
      } else {
        alert('Ошибка: ' + data.error);
      }
    } catch (error) {
      alert('Ошибка сети');
    }
  };

  return (
      <motion.main
        className="min-h-screen pb-20 bg-[#f8f9fb] dark:bg-surfaceDark text-textDark dark:text-white transition-colors"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
    >
      <div className="px-4 py-6">
        <h1 className="text-2xl font-bold mb-4 text-textDark dark:text-white">👤 Профиль</h1>

        {loading ? (
          <motion.div
            className="card text-center py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            >
              <div className="text-textLight dark:text-white">Загрузка...</div>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <motion.div
              className="card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
            >
              <h2 className="font-semibold mb-3">👋 Личная информация</h2>
              {profile?.id ? (
                <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-textLight dark:text-white">ID пользователя:</span> {profile.id}
                    </p>
                  {profile.firstName && (
                    <p>
                        <span className="text-textLight dark:text-white">Имя:</span> {profile.firstName}
                      {profile.lastName && ` ${profile.lastName}`}
                    </p>
                  )}
                </div>
              ) : (
                  <p className="text-textLight dark:text-white text-sm">
                  Откройте Mini App через Telegram для отображения вашего профиля
                </p>
              )}
            </motion.div>

            {/* Управление устройствами */}
            <motion.div
              className="card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: 0.05 }}
            >
              <h2 className="font-semibold mb-3">📱 Мои устройства</h2>
              <p className="text-textLight dark:text-white text-sm mb-3">
                Подключенные устройства (макс. 2):
              </p>
              {loadingDevices ? (
                <div className="text-center py-4 text-textLight dark:text-white">Загрузка...</div>
              ) : devices.length > 0 ? (
                  <div className="space-y-2">
                    {devices.map((device, idx) => (
                      <div key={idx} className="p-3 bg-blueGray-900 border border-borderDark rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <p className="text-xs text-blueGray-100 break-all">{device.device_id}</p>
                            <p className="text-xs text-blueGray-300 mt-1">IP: {device.ip}</p>
                            <p className="text-xs text-blueGray-300">
                              Последний вход: {new Date(device.last_seen).toLocaleString('ru')}
                            </p>
                          </div>
                          <motion.button whileTap={{ scale: 0.95 }}
                            onClick={() => handleRemoveDevice(device.device_id)}
                            className="ml-2 px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs rounded transition-colors"
                          >
                            ✕
                          </motion.button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-textLight dark:text-white text-sm text-center py-4">
                    Нет подключенных устройств
                  </p>
                )}
            </motion.div>

            <motion.div
              className="card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: 0.1 }}
            >
              <h2 className="font-semibold mb-3">📄 Пользовательское соглашение</h2>
              <motion.button whileTap={{ scale: 0.95 }}
                onClick={() => setShowTerms(true)}
                className="w-full p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 hover:border-blue-400 transition-colors text-left"
              >
                <div className="font-semibold text-textDark dark:text-white">Условия использования</div>
                <div className="text-xs text-textLight dark:text-white">Нажмите, чтобы прочитать</div>
              </motion.button>
            </motion.div>

            {/* Terms Modal */}
            <AnimatePresence>
              {showTerms && (
                <motion.div
                  className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowTerms(false)}
                >
                  <motion.div
                    className="bg-white dark:bg-surfaceDark w-full max-h-[85vh] rounded-t-3xl overflow-hidden"
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="sticky top-0 bg-white dark:bg-surfaceDark border-b border-borderLight dark:border-borderDark p-4 flex justify-between items-center">
                      <h2 className="text-xl font-bold text-textDark dark:text-white">📄 Пользовательское соглашение</h2>
                      <motion.button whileTap={{ scale: 0.95 }}
                        onClick={() => setShowTerms(false)}
                        className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xl"
                      >
                        ✕
                      </motion.button>
                    </div>
                    <div className="p-4 overflow-y-auto max-h-[calc(85vh-60px)] text-sm text-textDark dark:text-white space-y-4">
                      <section>
                        <h3 className="font-bold text-base mb-2">Условия использования</h3>
                        <p>Используя Nyxion, вы автоматически соглашаетесь с этими условиями использования и обязуетесь не нарушать законодательство Российской Федерации или других государств.</p>
                      </section>

                      <section>
                        <h3 className="font-bold text-base mb-2">Сервис</h3>
                        <p>VPN-сервис обеспечивает конфиденциальность личной информации путем шифрования и анонимизации метаданных пользователя, скрывая его IP-адрес. Эти адреса используют множество других пользователей, что не только обеспечивает конфиденциальность для каждого из них, но и затрудняет определение характера их деятельности. Мы не изменяем, не перенаправляем и не внедряемся в пользовательский трафик.</p>
                      </section>

                      <section>
                        <h3 className="font-bold text-base mb-2">Демо период</h3>
                        <p>Всем пользователям доступен демо период в течение трех дней с момента авторизации в приложении.</p>
                      </section>

                      <section>
                        <h3 className="font-bold text-base mb-2">Автоматическое продление</h3>
                        <p>Оплачивая подписку, вы соглашаетесь на автоматическое продление. Уведомление о том, что подписка закончится, приходит за один день до окончания подписки. Автоматическое продление можно отключить в любой момент в разделе «Профиль» → «Оплата».</p>
                      </section>

                      <section>
                        <h3 className="font-bold text-base mb-2">Использование подписки</h3>
                        <p>Подписка предоставляет право использования сервиса на ограниченном количестве устройств в соответствии с выбранным тарифным планом (от 1 до 5 устройств). Использование одной подписки на большем количестве устройств, чем предусмотрено вашим тарифом, считается злоупотреблением условиями использования сервиса. В случае выявления таких нарушений мы оставляем за собой право временно ограничить доступ к сервису или заблокировать учетную запись без компенсации неиспользованного периода подписки.</p>
                      </section>

                      <section>
                        <h3 className="font-bold text-base mb-2">Изменение стоимости подписки</h3>
                        <p>Мы оставляем за собой право изменять стоимость подписки. В случае повышения стоимости более чем на 10%, вы будете уведомлены заранее. Изменения вступают в силу со следующего платежного периода.</p>
                      </section>

                      <section>
                        <h3 className="font-bold text-base mb-2">Политика возврата</h3>
                        <p><strong>Условия возврата:</strong> вы можете запросить возврат средств, если полученные услуги были некачественными или не предоставлены в соответствии с условиями.</p>
                        <p><strong>Процедура возврата:</strong> Для запроса возврата, свяжитесь с нашей службой поддержки по указанным контактным данным. Мы рассмотрим ваш запрос и произведем возврат средств.</p>
                        <p><strong>Сроки возврата:</strong> Мы рассмотрим ваш запрос в течение дня. Срок исполнения возврата зависит от вашего банка.</p>
                      </section>

                      <section>
                        <h3 className="font-bold text-base mb-2">Конфиденциальность</h3>
                        <p>Мы полностью сохраняем вашу анонимность при использовании нашего сервиса. Поэтому мы не собираем и не храним данные о вашей онлайн-активности и не передаем их третьим сторонам. Мы применяем передовые методы шифрования для защиты вашей информации.</p>
                      </section>

                      <section>
                        <h3 className="font-bold text-base mb-2">Отказ от ответственности</h3>
                        <p>Мы оставляем за собой право изменять сервис, обновляя наше программное обеспечение или внося изменения в определенные функции. Мы стремимся минимизировать сбои и ошибки. Несмотря на наши усилия, сервис предоставляется на условиях «как есть» и «по мере доступности». Вы несете единоличную ответственность за использование вами сервиса.</p>
                      </section>

                      <p className="text-xs text-gray-500 dark:text-gray-400 pt-4 border-t border-borderLight dark:border-borderDark">Последнее обновление: январь 2026</p>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              className="card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: 0.1 }}
            >
              <h2 className="font-semibold mb-3">🔗 Быстрые ссылки</h2>
              <div className="space-y-2">
                <a href="/guide" className="block p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 hover:border-blue-400 transition-colors text-textDark dark:text-white">
                  <div className="font-semibold">📘 Инструкция</div>
                  <div className="text-xs text-textLight dark:text-white">Как подключиться к VPN</div>
                </a>
                <a href="/buy" className="block p-3 bg-green-500/10 rounded-lg border border-green-500/20 hover:border-green-400 transition-colors text-textDark dark:text-white">
                  <div className="font-semibold">💳 Купить подписку</div>
                  <div className="text-xs text-textLight dark:text-white">Активировать доступ VPN</div>
                </a>
              </div>
            </motion.div>

            <motion.div
              className="card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: 0.15 }}
            >
                <h2 className="font-semibold mb-3">❓ Поддержка</h2>
                <p className="text-textLight dark:text-white text-sm mb-3">Возникли проблемы? Свяжитесь с нами:</p>
              <a 
                href="https://t.me/nyxion_support" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block w-full p-3 bg-orange-500/10 rounded-lg border border-orange-500/20 hover:border-orange-400 transition-colors font-semibold text-sm text-center"
              >
                💬 Написать в поддержку
              </a>
            </motion.div>
          </div>
        )}
      </div>
    </motion.main>
  );
}
