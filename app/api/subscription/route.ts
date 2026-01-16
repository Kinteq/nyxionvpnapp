import { NextResponse } from 'next/server';

const VPS_API_URL = 'http://62.60.217.189:3333';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const deviceId = searchParams.get('deviceId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing userId' },
        { status: 400 }
      );
    }

    let url = `${VPS_API_URL}/api/subscription?userId=${userId}`;
    if (deviceId) {
      url += `&deviceId=${encodeURIComponent(deviceId)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
