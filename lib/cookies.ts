import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

export function getAuthTokenFromCookies() {
  return cookies().get('auth_token')?.value || null;
}

export function getAuthTokenFromRequest(request: NextRequest) {
  return request.cookies.get('auth_token')?.value || null;
}
