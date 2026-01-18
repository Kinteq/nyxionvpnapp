'use client';

import { useState } from 'react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function GuidePage() {
  const [selectedPlatform, setSelectedPlatform] = useState<'ios' | 'android' | 'windows' | 'macos' | null>(null);

  const steps = [
    { icon: '📱', title: '1. Скачайте приложение Hiddify', desc: 'Выберите платформу ниже для скачивания' },
    { icon: '🔑', title: '2. Получите ключ доступа', desc: 'Откройте раздел "Ключи" в нашем приложении и скопируйте ваш конфиг' },
    { icon: '⚙️', title: '3. Добавьте конфиг', desc: 'В Hiddify нажмите + → "Добавить из буфера обмена"' },
    { icon: '✅', title: '4. Подключитесь', desc: 'Нажмите большую кнопку подключения и пользуйтесь VPN' }
  ];

  const platforms = [
    { id: 'ios', icon: '🍎', name: 'iOS', note: '⚠️ Смена региона' },
    { id: 'android', icon: '🤖', name: 'Android', note: null },
    { id: 'windows', icon: '💻', name: 'Windows', note: null },
    { id: 'macos', icon: '🖥️', name: 'macOS', note: null },
  ];

  return (
    <main className="min-h-screen pb-28 bg-background dark:bg-surfaceDark">
      <div className="px-4 py-6">
        <h1 className="text-2xl font-bold mb-2 gradient-text animate-fade-in">
          📘 Инструкция по подключению
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 animate-fade-in">
          Пошаговое руководство для быстрого подключения
        </p>

        {/* Steps */}
        <div className="space-y-3 mb-6">
          {steps.map((step, idx) => (
            <div key={idx} className={`card card-animated stagger-${idx + 1}`}>
              <div className="flex items-start gap-3">
                <div className="text-3xl">{step.icon}</div>
                <div className="flex-1">
                  <h2 className="font-semibold mb-1">{step.title}</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{step.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Platform Selection */}
        <div className="card mb-6 card-animated stagger-5">
          <h3 className="font-semibold mb-3">📲 Скачать Hiddify</h3>
          <div className="grid grid-cols-2 gap-2">
            {platforms.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPlatform(selectedPlatform === p.id ? null : p.id as any)}
                className={`p-3 rounded-xl border-2 text-left active:scale-[0.97] transition-all duration-200 ${
                  selectedPlatform === p.id
                    ? 'border-coral bg-coral/10 shadow-lg shadow-coral/20'
                    : 'border-gray-200 dark:border-borderDark'
                }`}
              >
                <span className="text-2xl">{p.icon}</span>
                <div className="font-semibold text-sm mt-1">{p.name}</div>
                {p.note && <div className="text-xs text-yellow-500 mt-1">{p.note}</div>}
              </button>
            ))}
          </div>

          {selectedPlatform === 'ios' && (
            <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl animate-scale-in">
              <h4 className="font-bold text-yellow-500 mb-2">⚠️ Для iOS пользователей из РФ</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                Приложение Hiddify недоступно в российском App Store. Необходимо сменить регион Apple ID.
              </p>
              <div className="space-y-2">
                <a
                  href="https://support.apple.com/ru-ru/108996"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-blue-500/10 rounded-xl text-blue-500 text-sm active:scale-[0.98] transition-all duration-200"
                >
                  📖 Инструкция Apple по смене региона
                </a>
                <a
                  href="https://apps.apple.com/app/hiddify-proxy-vpn/id6596777532"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-gradient-to-r from-coral/20 to-peach/20 rounded-xl text-coral font-semibold text-center active:scale-[0.98] transition-all duration-200"
                >
                  📥 Скачать Hiddify из App Store
                </a>
              </div>
            </div>
          )}

          {selectedPlatform === 'android' && (
            <div className="mt-4 space-y-2 animate-scale-in">
              <a
                href="https://play.google.com/store/apps/details?id=app.hiddify.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-green-500/20 rounded-xl text-green-600 dark:text-green-400 font-semibold text-center active:scale-[0.98] transition-all duration-200"
              >
                📥 Google Play
              </a>
              <a
                href="https://github.com/hiddify/hiddify-app/releases/latest"
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-gray-500/20 rounded-xl font-semibold text-center active:scale-[0.98] transition-all duration-200"
              >
                📦 Скачать APK (GitHub)
              </a>
            </div>
          )}

          {selectedPlatform === 'windows' && (
            <div className="mt-4 animate-scale-in">
              <a
                href="https://github.com/hiddify/hiddify-app/releases/latest"
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-blue-500/20 rounded-xl text-blue-500 font-semibold text-center active:scale-[0.98] transition-all duration-200"
              >
                📥 Скачать для Windows (GitHub)
              </a>
            </div>
          )}

          {selectedPlatform === 'macos' && (
            <div className="mt-4 space-y-2 animate-scale-in">
              <a
                href="https://apps.apple.com/app/hiddify-proxy-vpn/id6596777532"
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-gradient-to-r from-coral/20 to-peach/20 rounded-xl text-coral font-semibold text-center active:scale-[0.98] transition-all duration-200"
              >
                📥 Mac App Store
              </a>
              <a
                href="https://github.com/hiddify/hiddify-app/releases/latest"
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-gray-500/20 rounded-xl font-semibold text-center active:scale-[0.98] transition-all duration-200"
              >
                📦 Скачать DMG (GitHub)
              </a>
            </div>
          )}
        </div>

        {/* FAQ */}
        <div className="card mb-6">
          <h3 className="font-semibold mb-3">❓ Частые вопросы</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-semibold">Как скопировать ключ?</p>
              <p className="text-gray-500 dark:text-gray-400">Перейдите в раздел "Ключи" и нажмите кнопку копирования</p>
            </div>
            <div>
              <p className="font-semibold">VPN не подключается?</p>
              <p className="text-gray-500 dark:text-gray-400">Убедитесь, что подписка активна и ключ скопирован полностью</p>
            </div>
            <div>
              <p className="font-semibold">Сколько устройств можно подключить?</p>
              <p className="text-gray-500 dark:text-gray-400">Одна подписка позволяет подключить до 2 устройств</p>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="card">
          <h3 className="font-semibold mb-3">🔗 Быстрые ссылки</h3>
          <div className="space-y-2">
            <Link href="/keys">
              <div className="p-3 bg-coral/10 rounded-xl border border-coral/20 active:scale-[0.98] transition-all duration-200">
                <div className="font-semibold">🔑 Мои ключи</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Скопировать конфиг для подключения</div>
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
    </main>
  );
}
