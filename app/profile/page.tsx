'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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

            {/* Управление устройствами */}
            <div className="card card-animated stagger-2">
              <h2 className="font-semibold mb-3">📱 Мои устройства</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">
                Подключенные устройства (макс. 2):
              </p>
              {loadingDevices ? (
                <div className="text-center py-4 text-gray-500">Загрузка...</div>
              ) : devices.length > 0 ? (
                <div className="space-y-2">
                  {devices.map((device, idx) => (
                    <div 
                      key={idx} 
                      className="p-3 bg-gray-50 dark:bg-cardDark border border-gray-200 dark:border-borderDark rounded-xl"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-xs font-mono text-gray-600 dark:text-gray-300 break-all">
                            {device.device_id.slice(0, 20)}...
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">IP: {device.ip}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Последний вход: {new Date(device.last_seen).toLocaleString('ru')}
                          </p>
                        </div>
                        <button 
                          onClick={() => handleRemoveDevice(device.device_id)}
                          className="ml-2 w-8 h-8 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg flex items-center justify-center text-sm active:scale-90 transition-all duration-200"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                  Нет подключенных устройств
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
                  className="bg-white dark:bg-surfaceDark w-full max-h-[85vh] rounded-t-3xl overflow-hidden animate-fade-in-up"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="sticky top-0 bg-white dark:bg-surfaceDark border-b border-gray-200 dark:border-borderDark p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold">📄 Пользовательское соглашение</h2>
                    <button 
                      onClick={() => setShowTerms(false)}
                      className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xl active:scale-90 transition-all duration-200"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="p-4 overflow-y-auto max-h-[calc(85vh-60px)] text-sm space-y-4">
                    <section>
                      <h3 className="font-bold text-base mb-2">Условия использования</h3>
                      <p className="text-gray-600 dark:text-gray-300">Используя Nyxion, вы автоматически соглашаетесь с этими условиями использования и обязуетесь не нарушать законодательство.</p>
                    </section>
                    <section>
                      <h3 className="font-bold text-base mb-2">Сервис</h3>
                      <p className="text-gray-600 dark:text-gray-300">VPN-сервис обеспечивает конфиденциальность личной информации путем шифрования и анонимизации метаданных пользователя.</p>
                    </section>
                    <section>
                      <h3 className="font-bold text-base mb-2">Демо период</h3>
                      <p className="text-gray-600 dark:text-gray-300">Всем пользователям доступен демо период в течение трех дней.</p>
                    </section>
                    <section>
                      <h3 className="font-bold text-base mb-2">Конфиденциальность</h3>
                      <p className="text-gray-600 dark:text-gray-300">Мы не собираем и не храним данные о вашей онлайн-активности.</p>
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
