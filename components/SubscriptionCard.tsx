"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface SubscriptionProps {
  subscription: {
    isActive: boolean;
    expiryDate?: string;
    daysLeft?: number;
    vpnUri?: string;
    trafficGb?: number | null;
    trafficUsedGb?: number;
    planType?: 'personal' | 'premium' | 'family';
    planName?: string;
    status?: 'Online' | 'Offline';
    onlineCount?: number;
  } | null;
}

const PLAN_INFO: Record<string, { name: string; icon: string; bgColor: string }> = {
  personal: { name: 'Личный', icon: '👤', bgColor: 'bg-blue-500' },
  premium: { name: 'Премиум', icon: '⭐', bgColor: 'bg-gradient-to-r from-coral to-peach' },
  family: { name: 'Семейный', icon: '👨‍👩‍👧‍👦', bgColor: 'bg-gradient-to-r from-purple-500 to-pink-500' },
};

export default function SubscriptionCard({ subscription }: SubscriptionProps) {
  const [showKey, setShowKey] = useState(false);
  const router = useRouter();

  if (!subscription?.isActive) {
    return (
      <div className="card border-2 border-dashed border-gray-300 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h3 className="text-xl font-semibold mb-2">У вас нет активной подписки</h3>
        <p className="text-textLight mb-4">
          Приобретите VPN для получения доступа к быстрому и безопасному интернету
        </p>
        <Link href="/buy">
          <button className="btn-primary w-full active:scale-[0.98] transition-transform">
            Купить подписку
          </button>
        </Link>
      </div>
    );
  }

  const planType = subscription.planType || 'premium';
  const planInfo = PLAN_INFO[planType] || PLAN_INFO.premium;
  const isLimited = subscription.trafficGb !== null && subscription.trafficGb !== undefined && subscription.trafficGb > 0;
  const trafficUsed = subscription.trafficUsedGb || 0;
  const trafficLimit = subscription.trafficGb || 0;
  const trafficPercent = isLimited ? Math.min(100, (trafficUsed / trafficLimit) * 100) : 0;
  const isOnline = subscription.status === 'Online';

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

  const formatTraffic = (gb: number) => {
    if (gb < 1) return `${(gb * 1024).toFixed(0)} МБ`;
    return `${gb.toFixed(1)} ГБ`;
  };

  const expiryDateObj = parseExpiryDate(subscription.expiryDate);
  const formattedDate = expiryDateObj
    ? expiryDateObj.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "N/A";

  return (
    <div className="card bg-card-gradient border-2 border-peach/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <span className={`font-semibold ${isOnline ? 'text-green-600' : 'text-gray-500'}`}>
            {isOnline ? 'Онлайн' : 'Офлайн'}
          </span>
          {isOnline && subscription.onlineCount && subscription.onlineCount > 0 && (
            <span className="text-xs text-gray-500">({subscription.onlineCount} подкл.)</span>
          )}
        </div>
        <div className={`px-3 py-1 ${planInfo.bgColor} text-white text-sm font-semibold rounded-full flex items-center gap-1`}>
          <span>{planInfo.icon}</span>
          <span>{planInfo.name}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-white dark:bg-cardDark rounded-xl">
          <div className="text-2xl font-bold gradient-text">{subscription.daysLeft || 0}</div>
          <div className="text-sm text-textLight">дней осталось</div>
        </div>
        <div className="text-center p-3 bg-white dark:bg-cardDark rounded-xl">
          <div className="text-2xl font-bold gradient-text">
            {isLimited ? `${trafficLimit}` : '∞'}
          </div>
          <div className="text-sm text-textLight">
            {isLimited ? 'ГБ/мес' : 'трафик'}
          </div>
        </div>
      </div>

      <div className="mb-4 p-3 bg-white dark:bg-cardDark rounded-xl">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-textLight">Использовано</span>
          <span className="text-sm font-medium">
            {isLimited 
              ? `${formatTraffic(trafficUsed)} / ${formatTraffic(trafficLimit)}`
              : formatTraffic(trafficUsed)
            }
          </span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          {isLimited ? (
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                trafficPercent > 90 ? 'bg-red-500' : trafficPercent > 70 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${trafficPercent}%` }}
            />
          ) : (
            <div 
              className="h-full bg-gradient-to-r from-coral to-peach rounded-full"
              style={{ width: `${Math.min(100, trafficUsed * 2)}%` }}
            />
          )}
        </div>
        {isLimited && trafficPercent > 90 && (
          <p className="text-xs text-red-500 mt-1">⚠️ Трафик почти исчерпан</p>
        )}
      </div>

      <div className="text-center mb-4">
        <p className="text-sm text-textLight">Действует до</p>
        <p className="text-lg font-semibold">{formattedDate}</p>
      </div>

      <div className="space-y-2">
        <button 
          onClick={() => setShowKey(!showKey)} 
          className="btn-secondary w-full flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          <span>🔑</span>
          <span>{showKey ? "Скрыть ключ" : "Показать VPN ключ"}</span>
        </button>
        
        {showKey && subscription.vpnUri && (
          <div className="rounded-lg border p-3 bg-slate-50 text-slate-800 border-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700">
            <p className="text-xs font-mono break-all mb-2">
              {subscription.vpnUri}
            </p>
            <button
              onClick={copyToClipboard}
              className="w-full py-2 text-sm font-semibold rounded-md inline-flex items-center justify-center gap-2 bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-100 border border-slate-300 dark:border-slate-500 active:scale-[0.98] transition-transform"
            >
              📋 Скопировать
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-borderDark">
        <button 
          onClick={() => router.push('/buy')} 
          className="btn-primary w-full active:scale-[0.98] transition-transform"
        >
          🔄 Продлить подписку
        </button>
      </div>
    </div>
  );
}
