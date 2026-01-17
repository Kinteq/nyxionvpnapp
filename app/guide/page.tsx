'use client';

import Header from '@/components/Header';
import Navigation from '@/components/Navigation';
import { motion } from 'framer-motion';
import { useState } from 'react';

export const dynamic = 'force-dynamic';

export default function GuidePage() {
  const [selectedPlatform, setSelectedPlatform] = useState<'ios' | 'android' | 'windows' | 'macos' | null>(null);

  const steps = [
    {
      icon: '📱',
      title: '1. Скачайте приложение Hiddify',
      desc: 'Выберите платформу ниже для скачивания'
    },
    {
      icon: '🔑',
      title: '2. Получите ключ доступа',
      desc: 'Откройте раздел "Ключи" в нашем приложении и скопируйте ваш конфиг'
    },
    {
      icon: '⚙️',
      title: '3. Добавьте конфиг',
      desc: 'В Hiddify нажмите + → "Добавить из буфера обмена"'
    },
    {
      icon: '✅',
      title: '4. Подключитесь',
      desc: 'Нажмите большую кнопку подключения и пользуйтесь VPN'
    }
  ];

  const platforms = [
    { id: 'ios', icon: '🍎', name: 'iOS', note: '⚠️ Требуется смена региона Apple ID' },
    { id: 'android', icon: '🤖', name: 'Android', note: null },
    { id: 'windows', icon: '💻', name: 'Windows', note: null },
    { id: 'macos', icon: '🖥️', name: 'macOS', note: null },
  ];

  return (
    <motion.main
      className="min-h-screen pb-20 bg-[#f8f9fb] dark:bg-surfaceDark"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
    >
      <Header />
      <div className="px-4 py-6">
        <h1 className="text-2xl font-bold mb-2 text-textDark dark:text-white">📘 Инструкция по подключению</h1>
        <p className="text-textLight dark:text-white text-sm mb-6">Пошаговое руководство для быстрого подключения</p>

        <div className="space-y-3 mb-6">
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              className="card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.05 }}
            >
              <div className="flex items-start gap-3">
                <div className="text-3xl">{step.icon}</div>
                <div className="flex-1">
                  <h2 className="font-semibold mb-1 text-textDark dark:text-white">{step.title}</h2>
                  <p className="text-textLight dark:text-white text-sm">{step.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Platform Selection */}
        <motion.div
          className="card mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.2 }}
        >
          <h3 className="font-semibold mb-3 text-textDark dark:text-white">📲 Скачать Hiddify</h3>
          <div className="grid grid-cols-2 gap-2">
            {platforms.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPlatform(p.id as any)}
                className={`p-3 rounded-xl border-2 transition-all text-left ${
                  selectedPlatform === p.id
                    ? 'border-coral bg-coral/10'
                    : 'border-borderLight dark:border-borderDark hover:border-coral'
                }`}
              >
                <span className="text-2xl">{p.icon}</span>
                <div className="font-semibold text-sm mt-1 text-textDark dark:text-white">{p.name}</div>
                {p.note && <div className="text-xs text-yellow-500 mt-1">{p.note}</div>}
              </button>
            ))}
          </div>

          {selectedPlatform === 'ios' && (
            <motion.div
              className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <h4 className="font-bold text-yellow-500 mb-2">⚠️ Для iOS пользователей из РФ</h4>
              <p className="text-sm text-textDark dark:text-white mb-3">
                Приложение Hiddify недоступно в российском App Store. Необходимо сменить регион Apple ID.
              </p>
              <div className="space-y-2">
                <a
                  href="https://support.apple.com/ru-ru/108996"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-2 bg-blue-500/10 rounded-lg text-blue-400 text-sm hover:bg-blue-500/20 transition-colors"
                >
                  📖 Инструкция Apple по смене региона
                </a>
                <a
                  href="https://apps.apple.com/app/hiddify-proxy-vpn/id6596777532"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-coral/20 rounded-lg text-coral font-semibold text-center hover:bg-coral/30 transition-colors"
                >
                  📥 Скачать Hiddify из App Store
                </a>
              </div>
            </motion.div>
          )}

          {selectedPlatform === 'android' && (
            <motion.div
              className="mt-4 space-y-2"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <a
                href="https://play.google.com/store/apps/details?id=app.hiddify.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-green-500/20 rounded-lg text-green-400 font-semibold text-center hover:bg-green-500/30 transition-colors"
              >
                📥 Google Play
              </a>
              <a
                href="https://github.com/hiddify/hiddify-app/releases/latest"
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-gray-500/20 rounded-lg text-textDark dark:text-white font-semibold text-center hover:bg-gray-500/30 transition-colors"
              >
                📦 Скачать APK (GitHub)
              </a>
            </motion.div>
          )}

          {selectedPlatform === 'windows' && (
            <motion.div
              className="mt-4"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <a
                href="https://github.com/hiddify/hiddify-app/releases/latest"
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-blue-500/20 rounded-lg text-blue-400 font-semibold text-center hover:bg-blue-500/30 transition-colors"
              >
                📥 Скачать для Windows (GitHub)
              </a>
            </motion.div>
          )}

          {selectedPlatform === 'macos' && (
            <motion.div
              className="mt-4 space-y-2"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <a
                href="https://apps.apple.com/app/hiddify-proxy-vpn/id6596777532"
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-coral/20 rounded-lg text-coral font-semibold text-center hover:bg-coral/30 transition-colors"
              >
                📥 Mac App Store
              </a>
              <a
                href="https://github.com/hiddify/hiddify-app/releases/latest"
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-gray-500/20 rounded-lg text-textDark dark:text-white font-semibold text-center hover:bg-gray-500/30 transition-colors"
              >
                📦 Скачать DMG (GitHub)
              </a>
            </motion.div>
          )}
        </motion.div>

        <motion.div
          className="card bg-blue-500/10 border border-blue-500/20"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.25 }}
        >
          <h3 className="font-semibold mb-3 text-textDark dark:text-white">💡 Советы</h3>
          <ul className="text-sm text-textLight dark:text-white space-y-2">
            <li>✓ Убедитесь, что приложение обновлено до последней версии</li>
            <li>✓ Проверьте интернет-соединение перед подключением</li>
            <li>✓ При проблемах попробуйте переподключиться</li>
            <li>✓ Некоторые приложения могут конфликтовать с VPN</li>
          </ul>
        </motion.div>

        <motion.div
          className="card mt-4 bg-purple-500/10 border border-purple-500/20"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.3 }}
        >
          <h3 className="font-semibold mb-2 text-textDark dark:text-white">🔗 Официальные ресурсы Hiddify</h3>
          <a
            href="https://github.com/hiddify/hiddify-app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-coral hover:underline"
          >
            github.com/hiddify/hiddify-app
          </a>
        </motion.div>

        <motion.a
          href="/keys"
          className="btn-primary w-full text-center block py-3 mt-6"
          whileTap={{ scale: 0.98 }}
          whileHover={{ scale: 1.01 }}
        >
          🔑 Открыть мои ключи
        </motion.a>
      </div>
      <Navigation />
    </motion.main>
  );
}
