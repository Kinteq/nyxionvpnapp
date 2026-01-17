'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } }
};

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
    <motion.main
      className="min-h-screen pb-28 bg-background dark:bg-surfaceDark"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="px-4 py-6">
        <motion.h1 variants={itemVariants} className="text-2xl font-bold mb-2 gradient-text">
          📘 Инструкция по подключению
        </motion.h1>
        <motion.p variants={itemVariants} className="text-gray-500 dark:text-gray-400 text-sm mb-6">
          Пошаговое руководство для быстрого подключения
        </motion.p>

        {/* Steps */}
        <div className="space-y-3 mb-6">
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              className="card"
            >
              <div className="flex items-start gap-3">
                <div className="text-3xl">{step.icon}</div>
                <div className="flex-1">
                  <h2 className="font-semibold mb-1">{step.title}</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{step.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Platform Selection */}
        <motion.div variants={itemVariants} className="card mb-6">
          <h3 className="font-semibold mb-3">📲 Скачать Hiddify</h3>
          <div className="grid grid-cols-2 gap-2">
            {platforms.map((p) => (
              <motion.button
                key={p.id}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedPlatform(selectedPlatform === p.id ? null : p.id as any)}
                className={`p-3 rounded-xl border-2 text-left transition-colors ${
                  selectedPlatform === p.id
                    ? 'border-coral bg-coral/10 shadow-lg shadow-coral/20'
                    : 'border-gray-200 dark:border-borderDark hover:border-coral/50'
                }`}
              >
                <span className="text-2xl">{p.icon}</span>
                <div className="font-semibold text-sm mt-1">{p.name}</div>
                {p.note && <div className="text-xs text-yellow-500 mt-1">{p.note}</div>}
              </motion.button>
            ))}
          </div>

          <AnimatePresence>
            {selectedPlatform === 'ios' && (
              <motion.div
                className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <h4 className="font-bold text-yellow-500 mb-2">⚠️ Для iOS пользователей из РФ</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  Приложение Hiddify недоступно в российском App Store. Необходимо сменить регион Apple ID.
                </p>
                <div className="space-y-2">
                  <motion.a
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    href="https://support.apple.com/ru-ru/108996"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 bg-blue-500/10 rounded-xl text-blue-500 text-sm hover:bg-blue-500/20"
                  >
                    📖 Инструкция Apple по смене региона
                  </motion.a>
                  <motion.a
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    href="https://apps.apple.com/app/hiddify-proxy-vpn/id6596777532"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 bg-gradient-to-r from-coral/20 to-peach/20 rounded-xl text-coral font-semibold text-center"
                  >
                    📥 Скачать Hiddify из App Store
                  </motion.a>
                </div>
              </motion.div>
            )}

            {selectedPlatform === 'android' && (
              <motion.div
                className="mt-4 space-y-2"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <motion.a
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  href="https://play.google.com/store/apps/details?id=app.hiddify.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-green-500/20 rounded-xl text-green-600 dark:text-green-400 font-semibold text-center"
                >
                  📥 Google Play
                </motion.a>
                <motion.a
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  href="https://github.com/hiddify/hiddify-app/releases/latest"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-gray-500/20 rounded-xl font-semibold text-center"
                >
                  📦 Скачать APK (GitHub)
                </motion.a>
              </motion.div>
            )}

            {selectedPlatform === 'windows' && (
              <motion.div
                className="mt-4"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <motion.a
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  href="https://github.com/hiddify/hiddify-app/releases/latest"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-blue-500/20 rounded-xl text-blue-500 font-semibold text-center"
                >
                  📥 Скачать для Windows (GitHub)
                </motion.a>
              </motion.div>
            )}

            {selectedPlatform === 'macos' && (
              <motion.div
                className="mt-4 space-y-2"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <motion.a
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  href="https://apps.apple.com/app/hiddify-proxy-vpn/id6596777532"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-gradient-to-r from-coral/20 to-peach/20 rounded-xl text-coral font-semibold text-center"
                >
                  📥 Mac App Store
                </motion.a>
                <motion.a
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  href="https://github.com/hiddify/hiddify-app/releases/latest"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-gray-500/20 rounded-xl font-semibold text-center"
                >
                  📦 Скачать DMG (GitHub)
                </motion.a>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Tips */}
        <motion.div variants={itemVariants} className="card bg-blue-500/10 border border-blue-500/20 mb-4">
          <h3 className="font-semibold mb-3">💡 Советы</h3>
          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
            <li>✓ Убедитесь, что приложение обновлено до последней версии</li>
            <li>✓ Проверьте интернет-соединение перед подключением</li>
            <li>✓ При проблемах попробуйте переподключиться</li>
          </ul>
        </motion.div>

        {/* CTA */}
        <motion.div variants={itemVariants}>
          <Link href="/keys">
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: '0 15px 30px -8px rgba(255, 154, 139, 0.4)' }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 bg-gradient-to-r from-coral to-peach text-white font-bold rounded-xl shadow-lg shadow-coral/20 text-center"
            >
              🔑 Открыть мои ключи
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </motion.main>
  );
}
