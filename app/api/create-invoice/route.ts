import { NextResponse } from 'next/server';

const VPS_API_URL = 'http://62.60.217.189:3333';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, method, asset, amount } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing userId' },
        { status: 400 }
      );
    }

    // Прокси запрос к VPS API
    const response = await fetch(`${VPS_API_URL}/api/create-invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        method: method || 'cryptobot',
        asset: asset || 'USDT',
        amount: amount || 2.0,
      }),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
