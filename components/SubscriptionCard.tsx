"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

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
          <button className="btn-primary w-full">Купить подписку</button>
        </Link>
      </motion.div>
    );
  }

  const copyToClipboard = () => {
    if (subscription.vpnUri) {
      navigator.clipboard.writeText(subscription.vpnUri);
      const w: any = typeof window !== 'undefined' ? (window as any) : undefined;
      if (w?.Telegram?.WebApp) {
        w.Telegram.WebApp.showPopup({
          title: "Скопировано!",
          message: "VPN ключ скопирован в буфер обмена",
          buttons: [{ type: "ok" }],
        });
      }
    }
  };

  const parseExpiryDate = (dateStr?: string): Date | null => {
    if (!dateStr) return null;

    if (dateStr.includes("-") || dateStr.includes("T")) {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    }

    const parts = dateStr.split(".");
    if (parts.length === 3) {
      const [day, month, year] = parts.map((p) => parseInt(p, 10));
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month - 1, day);
      }
    }

    return null;
  };

  const expiryDateObj = parseExpiryDate(subscription.expiryDate);
  const formattedDate = expiryDateObj
    ? expiryDateObj.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "N/A";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card bg-card-gradient border-2 border-peach/20"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <span className="font-semibold text-green-600">Активна</span>
        </div>
        <div className="px-3 py-1 bg-nyxion-gradient text-white text-sm font-semibold rounded-full">Premium</div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-white rounded-xl">
          <div className="text-2xl font-bold gradient-text">{subscription.daysLeft || 0}</div>
          <div className="text-sm text-textLight">дней осталось</div>
        </div>
        
        <div className="text-center p-3 bg-white rounded-xl">
          <div className="text-2xl font-bold gradient-text">∞</div>
          <div className="text-sm text-textLight">трафик</div>
        </div>
      </div>

      <div className="text-center mb-4">
        <p className="text-sm text-textLight">Действует до</p>
        <p className="text-lg font-semibold">{formattedDate}</p>
      </div>

      <div className="space-y-2">
        <button onClick={() => setShowKey(!showKey)} className="btn-secondary w-full flex items-center justify-center gap-2">
          <span>🔑</span>
          <span>{showKey ? "Скрыть ключ" : "Показать VPN ключ"}</span>
        </button>
        
        {showKey && subscription.vpnUri && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="rounded-lg border p-3 bg-slate-50 text-slate-800 border-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700"
          >
            <p className="text-xs font-mono break-all mb-2 selection:bg-emerald-500/20 selection:text-slate-900 dark:selection:text-slate-100">{subscription.vpnUri}</p>
            <button
              onClick={copyToClipboard}
              className="w-full py-2 text-sm font-semibold rounded-md inline-flex items-center justify-center gap-2 bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 transition-colors"
            >
              📋 Скопировать
            </button>
          </motion.div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <button onClick={() => router.push('/buy')} className="btn-primary w-full">
          🔄 Продлить подписку
        </button>
      </div>
    </motion.div>
  );
}
