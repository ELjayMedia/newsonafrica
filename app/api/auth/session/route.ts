import { NextResponse } from 'next/server';

import { WORDPRESS_REST_API_URL } from '@/config/wordpress';
import { getAuthTokenFromCookies } from '@/lib/cookies';

export async function GET() {
  const token = getAuthTokenFromCookies();

  if (!token) {
    return NextResponse.json({ user: null });
  }

  try {
    const response = await fetch(`${WORDPRESS_REST_API_URL}/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user data');
    }

    const userData = await response.json();

    return NextResponse.json({
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        avatar_urls: userData.avatar_urls,
      },
    });
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json({ user: null });
  }
}
