import { NextResponse } from 'next/server';

const VPS_API_URL = 'http://62.60.217.189:3333';

export async function POST(request: Request) {
  try {
    const { userId, promoCode } = await request.json();

    if (!userId || !promoCode) {
      return NextResponse.json(
        { success: false, error: 'Missing userId or promoCode' },
        { status: 400 }
      );
    }

    // Прокси запрос к VPS API
    const response = await fetch(`${VPS_API_URL}/api/activate-promo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, promoCode }),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    console.error('Error activating promo code:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
