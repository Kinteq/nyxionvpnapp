import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

const YOOKASSA_SHOP_ID = '1251616';
const YOOKASSA_SECRET_KEY = 'test_YtBqR9quaZDLY717EpjljCeaXuRXWpTZh2t6CqkJEbs';
const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3/payments';

// Названия тарифов
const TARIFF_NAMES: Record<string, string> = {
  personal: 'Личный',
  premium: 'Премиум',
  family: 'Семейный',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, planType, days, price, trafficGb, maxIps } = body;

    if (!userId || !planType || !days || !price) {
      return NextResponse.json(
        { error: 'userId, planType, days and price are required' },
        { status: 400 }
      );
    }

    // Ключ идемпотентности
    const idempotenceKey = uuidv4();

    // Определяем период
    const periodName = days >= 365 ? '1 год' : days >= 180 ? '6 месяцев' : days >= 90 ? '3 месяца' : '1 месяц';
    const tariffName = TARIFF_NAMES[planType] || planType;
    
    // Лимит трафика в байтах (trafficGb = null означает безлимит)
    const trafficLimitBytes = trafficGb ? trafficGb * 1024 * 1024 * 1024 : 0;

    // Формируем запрос к ЮKassa
    const paymentData = {
      amount: {
        value: Number(price).toFixed(2),
        currency: 'RUB',
      },
      capture: true, // Автоматическое подтверждение платежа
      confirmation: {
        type: 'redirect',
        return_url: `https://nyxionvpnapp.vercel.app/payment/success?userId=${userId}`,
      },
      description: `Nyxion VPN: ${tariffName} (${periodName})`,
      metadata: {
        userId: String(userId),
        tariffType: planType,
        days: days,
        trafficLimit: trafficLimitBytes,
        deviceLimit: maxIps || 2,
        price: price,
      },
    };

    // Отправляем запрос в ЮKassa
    const auth = Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString('base64');

    const response = await fetch(YOOKASSA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
        'Idempotence-Key': idempotenceKey,
      },
      body: JSON.stringify(paymentData),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('YooKassa error:', result);
      return NextResponse.json(
        { error: result.description || 'Payment creation failed' },
        { status: response.status }
      );
    }

    // Возвращаем URL для редиректа
    return NextResponse.json({
      paymentId: result.id,
      confirmationUrl: result.confirmation?.confirmation_url,
      status: result.status,
    });

  } catch (error) {
    console.error('Payment create error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
