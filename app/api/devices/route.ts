import { NextResponse } from 'next/server';

const VPS_API_URL = 'http://62.60.217.189:3333';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing userId' },
        { status: 400 }
      );
    }

    const response = await fetch(`${VPS_API_URL}/api/devices?userId=${userId}`, {
      method: 'GET',
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    console.error('Error fetching devices:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId, deviceId } = await request.json();

    if (!userId || !deviceId) {
      return NextResponse.json(
        { success: false, error: 'Missing userId or deviceId' },
        { status: 400 }
      );
    }

    const response = await fetch(`${VPS_API_URL}/api/devices`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, deviceId }),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    console.error('Error removing device:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
