'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface KeyData {
  vpnUri: string;
  expiryDate: string;
  daysLeft: number;
}

export default function KeysPage() {
  const [keys, setKeys] = useState<KeyData | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadKeys = async () => {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        const user = window.Telegram.WebApp.initDataUnsafe?.user;
        if (user?.id) {
          setUserId(user.id);
          try {
            const res = await fetch(`/api/subscription?userId=${user.id}`);
            const data = await res.json();
            if (data.isActive) setKeys(data);
          } catch (error) {
            console.error('Error loading keys:', error);
          }
        }
      }
      setLoading(false);
    };
    loadKeys();
  }, []);

  const copyToClipboard = async () => {
    if (!keys?.vpnUri) return;
    await navigator.clipboard.writeText(keys.vpnUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    if (window.Telegram?.WebApp?.showPopup) {
      window.Telegram.WebApp.showPopup({
        title: 'Скопировано!',
        message: 'VPN ключ скопирован в буфер обмена',
        buttons: [{ type: 'ok' }],
      });
    }
  };

  return (
    <main className="min-h-screen pb-28 bg-background dark:bg-surfaceDark">
      <div className="px-4 py-6">
        <h1 className="text-2xl font-bold mb-4 gradient-text animate-fade-in">
          🔑 Мои ключи
        </h1>
        
        {loading ? (
          <div className="card text-center py-12">
            <div className="w-10 h-10 border-3 border-coral border-t-transparent rounded-full mx-auto mb-4 animate-spin" />
            <div className="text-gray-500">Загрузка...</div>
          </div>
        ) : keys ? (
          <div className="space-y-4">
            <div className="card card-animated stagger-1">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <h2 className="font-semibold">Активная подписка</h2>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Истекает: <span className="font-medium text-textDark dark:text-white">{keys.expiryDate}</span>
                <span className="ml-2 px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-xs">
                  {keys.daysLeft} дней
                </span>
              </p>
              
              <div className="rounded-xl border p-4 mb-4 bg-gray-50 dark:bg-cardDark border-gray-200 dark:border-borderDark">
                <p className="text-xs font-mono break-all text-gray-600 dark:text-gray-300 select-all">
                  {keys.vpnUri}
                </p>
              </div>
              
              <button 
                onClick={copyToClipboard}
                className={`w-full py-3 text-sm font-semibold rounded-xl inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-all duration-200 ${
                  copied 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gradient-to-r from-coral to-peach text-white shadow-lg shadow-coral/20'
                }`}
              >
                {copied ? '✓ Скопировано!' : '📋 Скопировать ключ'}
              </button>
            </div>

            <div className="card card-animated stagger-2">
              <h2 className="font-semibold mb-3">📱 Как подключиться?</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Скопируйте ключ и добавьте его в приложение Hiddify
              </p>
              <Link href="/guide">
                <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 active:scale-[0.98] transition-all duration-200">
                  <div className="font-semibold">📘 Открыть инструкцию</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Пошаговое руководство</div>
                </div>
              </Link>
            </div>
          </div>
        ) : (
          <div className="card text-center py-12 card-animated">
            <div className="text-5xl mb-4">🔒</div>
            <h2 className="font-semibold text-lg mb-2">Нет активной подписки</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Приобретите подписку, чтобы получить VPN ключ
            </p>
            <Link href="/buy">
              <button className="px-6 py-3 bg-gradient-to-r from-coral to-peach text-white font-semibold rounded-xl shadow-lg shadow-coral/20 active:scale-[0.97] transition-all duration-200">
                💎 Купить подписку
              </button>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
