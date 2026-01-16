'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';

interface SubscriptionProps {
  subscription: {
    isActive: boolean;
    expiryDate?: string;
    daysLeft?: number;
    vpnUri?: string;
    trafficGb?: number;
  } | null;
}

export default function SubscriptionCard({ subscription }: SubscriptionProps) {
  const [showKey, setShowKey] = useState(false);

  if (!subscription?.isActive) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card border-2 border-dashed border-gray-300 text-center"
      >
        <div className="text-6xl mb-4">🔒</div>
        <h3 className="text-xl font-semibold mb-2">У вас нет активной подписки</h3>
        <p className="text-textLight mb-4">
          Приобретите VPN для получения доступа к быстрому и безопасному интернету
        </p>
        <Link href="/buy">
          <button className="btn-primary w-full">
            Купить подписку
          </button>
        </Link>
      </motion.div>
    );
  }

  const copyToClipboard = () => {
    if (subscription.vpnUri) {
      navigator.clipboard.writeText(subscription.vpnUri);
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.showPopup({
          title: 'Скопировано!',
          message: 'VPN ключ скопирован в буфер обмена',
          buttons: [{ type: 'ok' }]
        });
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card bg-card-gradient border-2 border-peach/20"
    >
      {/* Status Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <span className="font-semibold text-green-600">Активна</span>
        </div>
        <div className="px-3 py-1 bg-nyxion-gradient text-white text-sm font-semibold rounded-full">
          Premium
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-white rounded-xl">
          <div className="text-2xl font-bold gradient-text">
            {subscription.daysLeft || 0}
          </div>
          <div className="text-sm text-textLight">дней осталось</div>
        </div>
        
        <div className="text-center p-3 bg-white rounded-xl">
          <div className="text-2xl font-bold gradient-text">∞</div>
          <div className="text-sm text-textLight">трафик</div>
        </div>
      </div>

      {/* Expiry Date */}
      <div className="text-center mb-4">
        <p className="text-sm text-textLight">Действует до</p>
        <p className="text-lg font-semibold">
          {subscription.expiryDate ? new Date(subscription.expiryDate).toLocaleDateString('ru-RU') : 'N/A'}
        </p>
      </div>

      {/* VPN Key */}
      <div className="space-y-2">
        <button
          onClick={() => setShowKey(!showKey)}
          className="btn-secondary w-full flex items-center justify-center gap-2"
        >
          <span>🔑</span>
          <span>{showKey ? 'Скрыть ключ' : 'Показать VPN ключ'}</span>
        </button>
        
        {showKey && subscription.vpnUri && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-3 bg-gray-100 rounded-lg"
          >
            <p className="text-xs font-mono break-all text-textDark mb-2">
              {subscription.vpnUri}
            </p>
            <button
              onClick={copyToClipboard}
              className="w-full py-2 bg-white rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              📋 Скопировать
            </button>
          </motion.div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <button className="btn-primary w-full">
          🔄 Продлить подписку
        </button>
      </div>
    </motion.div>
  );
}
