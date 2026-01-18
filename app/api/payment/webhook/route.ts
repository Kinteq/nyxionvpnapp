import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API_URL = 'http://62.60.217.189:3333';

interface YooKassaNotification {
  type: string;
  event: string;
  object: {
    id: string;
    status: string;
    amount: {
      value: string;
      currency: string;
    };
    metadata?: {
      userId?: string;
      tariffType?: string;
      days?: number | string;
      trafficLimit?: number | string;
      deviceLimit?: number | string;
      price?: number | string;
    };
    paid: boolean;
  };
}

export async function POST(request: NextRequest) {
  try {
    const notification: YooKassaNotification = await request.json();

    console.log('YooKassa webhook received:', JSON.stringify(notification, null, 2));

    // Проверяем что это уведомление об успешном платеже
    if (notification.event !== 'payment.succeeded') {
      console.log('Ignoring event:', notification.event);
      return NextResponse.json({ status: 'ok' });
    }

    const payment = notification.object;
    
    if (!payment.paid || payment.status !== 'succeeded') {
      console.log('Payment not succeeded:', payment.status);
      return NextResponse.json({ status: 'ok' });
    }

    const metadata = payment.metadata || {};
    const userId = metadata.userId;
    const tariffType = metadata.tariffType || 'premium';
    const days = Number(metadata.days) || 30;
    const trafficLimit = Number(metadata.trafficLimit) || 0;
    const deviceLimit = Number(metadata.deviceLimit) || 2;

    if (!userId) {
      console.error('Missing userId in payment metadata:', payment.id);
      return NextResponse.json({ status: 'ok' });
    }

    console.log(`Activating subscription for user ${userId}: ${tariffType} for ${days} days`);

    // Активируем подписку через backend API
    const activateResponse = await fetch(`${BACKEND_API_URL}/api/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: parseInt(userId),
        days: days,
        tariff: tariffType,
        trafficLimit: trafficLimit,
        deviceLimit: deviceLimit,
        paymentId: payment.id,
        amount: payment.amount.value,
      }),
    });

    if (!activateResponse.ok) {
      const error = await activateResponse.text();
      console.error('Failed to activate subscription:', error);
      // Всё равно возвращаем 200, чтобы ЮKassa не слала повторно
      return NextResponse.json({ status: 'error', message: error });
    }

    const result = await activateResponse.json();
    console.log('Subscription activated:', result);

    return NextResponse.json({ status: 'ok' });

  } catch (error) {
    console.error('Webhook processing error:', error);
    // Возвращаем 200 чтобы ЮKassa не повторяла запрос
    return NextResponse.json({ status: 'error', message: String(error) });
  }
}

// ЮKassa также может отправлять GET для проверки доступности
export async function GET() {
  return NextResponse.json({ status: 'webhook endpoint active' });
}
