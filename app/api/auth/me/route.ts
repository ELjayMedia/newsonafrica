import { NextResponse } from 'next/server';

import { getCurrentUser, getAuthToken } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const token = await getAuthToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const user = await getCurrentUser(token);
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching current user:', error);
    return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
  }
}
