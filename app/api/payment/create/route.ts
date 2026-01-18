import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

const YOOKASSA_SHOP_ID = '1251616';
const YOOKASSA_SECRET_KEY = 'test_YtBqR9quaZDLY717EpjljCeaXuRXWpTZh2t6CqkJEbs';
const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3/payments';

// Тарифы с ценами
const TARIFFS: Record<string, { name: string; price: number; days: number }> = {
  personal_month: { name: 'Личный (1 месяц)', price: 99, days: 30 },
  personal_year: { name: 'Личный (1 год)', price: 999, days: 365 },
  premium_month: { name: 'Премиум (1 месяц)', price: 149, days: 30 },
  premium_year: { name: 'Премиум (1 год)', price: 1490, days: 365 },
  family_month: { name: 'Семейный (1 месяц)', price: 249, days: 30 },
  family_year: { name: 'Семейный (1 год)', price: 2490, days: 365 },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, tariffId } = body;

    if (!userId || !tariffId) {
      return NextResponse.json(
        { error: 'userId and tariffId are required' },
        { status: 400 }
      );
    }

    const tariff = TARIFFS[tariffId];
    if (!tariff) {
      return NextResponse.json(
        { error: 'Invalid tariff' },
        { status: 400 }
      );
    }

    // Ключ идемпотентности
    const idempotenceKey = uuidv4();

    // Формируем запрос к ЮKassa
    const paymentData = {
      amount: {
        value: tariff.price.toFixed(2),
        currency: 'RUB',
      },
      capture: true, // Автоматическое подтверждение платежа
      confirmation: {
        type: 'redirect',
        return_url: `https://nyxionvpnapp.vercel.app/payment/success?userId=${userId}`,
      },
      description: `Nyxion VPN: ${tariff.name}`,
      metadata: {
        userId: String(userId),
        tariffId: tariffId,
        days: tariff.days,
        tariffType: tariffId.split('_')[0], // personal, premium, family
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
