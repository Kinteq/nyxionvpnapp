'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');
  const [status, setStatus] = useState<'loading' | 'success' | 'pending'>('loading');

  useEffect(() => {
    // Небольшая задержка чтобы webhook успел обработаться
    const timer = setTimeout(() => {
      setStatus('success');
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
      <div className="bg-white dark:bg-surfaceDark rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
        {status === 'loading' ? (
          <>
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Обработка платежа...</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Пожалуйста, подождите
            </p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <span className="text-5xl">✅</span>
            </div>
            <h1 className="text-2xl font-bold mb-2 text-green-600 dark:text-green-400">
              Оплата прошла успешно!
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Ваша подписка Nyxion VPN активирована. 
              Вернитесь в приложение для получения конфигурации.
            </p>
            
            <div className="space-y-3">
              <Link
                href="/"
                className="block w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                Открыть приложение
              </Link>
              
              <a
                href="https://t.me/nyxionvpnbot"
                className="block w-full py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Открыть в Telegram
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
