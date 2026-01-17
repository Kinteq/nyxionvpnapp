'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

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
                Подключенные устройства (макс. 3):
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
                          <button
                            onClick={() => handleRemoveDevice(device.device_id)}
                            className="ml-2 px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs rounded transition-colors"
                          >
                            ✕
                          </button>
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
                <div className="space-y-2 text-sm text-textLight dark:text-white">
                <p>Используя Nyxion VPN, вы подтверждаете согласие со следующими условиями:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Не используйте сервис для незаконной деятельности.</li>
                  <li>Не распространяйте ваш доступ третьим лицам.</li>
                  <li>Мы не храним логи вашей активности в сети.</li>
                  <li>Поддержка доступна 24/7, пишите при любых проблемах.</li>
                </ul>
                  <p className="text-xs text-gray-500 dark:text-gray-300">Последнее обновление: январь 2026</p>
              </div>
            </motion.div>

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
              <button className="w-full p-3 bg-orange-500/10 rounded-lg border border-orange-500/20 hover:border-orange-400 transition-colors font-semibold text-sm">
                💬 Написать в поддержку
              </button>
            </motion.div>
          </div>
        )}
      </div>
    </motion.main>
  );
}
