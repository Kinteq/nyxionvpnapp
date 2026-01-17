'use client';

import Header from '@/components/Header';
import Navigation from '@/components/Navigation';
import { motion } from 'framer-motion';

export const dynamic = 'force-dynamic';

export default function GuidePage() {
  const steps = [
    {
      icon: '📱',
      title: '1. Скачайте приложение',
      desc: 'Установите Hysteria для вашей платформы (iOS, Android, Windows, macOS)'
    },
    {
      icon: '🔑',
      title: '2. Получите ключ доступа',
      desc: 'Откройте раздел "Ключи" в приложении и скопируйте ваш конфиг'
    },
    {
      icon: '⚙️',
      title: '3. Добавьте конфиг',
      desc: 'Вставьте скопированный ключ в приложение Hysteria'
    },
    {
      icon: '✅',
      title: '4. Подключитесь',
      desc: 'Нажмите кнопку "Подключиться" и начните использовать VPN'
    }
  ];

  return (
    <motion.main
      className="min-h-screen pb-20"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
    >
      <Header />
      <div className="px-4 py-6">
        <h1 className="text-2xl font-bold mb-2">📘 Инструкция по подключению</h1>
        <p className="text-textLight text-sm mb-6">Пошаговое руководство для быстрого подключения</p>

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
                  <h2 className="font-semibold mb-1">{step.title}</h2>
                  <p className="text-textLight text-sm">{step.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="card bg-blue-500/10 border border-blue-500/20"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.25 }}
        >
          <h3 className="font-semibold mb-3">💡 Советы</h3>
          <ul className="text-sm text-textLight space-y-2">
            <li>✓ Убедитесь, что приложение обновлено до последней версии</li>
            <li>✓ Проверьте интернет-соединение перед подключением</li>
            <li>✓ При проблемах попробуйте переподключиться</li>
            <li>✓ Некоторые приложения могут конфликтовать с VPN</li>
          </ul>
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
