import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { resolveCountry } from '@/config/countries';
import { buildCsp } from '@/server/security/csp';

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const country = resolveCountry(req.headers.get('host') ?? '', url.pathname);
  const res = NextResponse.next();
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const prod = process.env.NODE_ENV === 'production';
  res.headers.set('Content-Security-Policy', buildCsp({ nonce, prod }));
  res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set(
    'Permissions-Policy',
    [
      'accelerometer=()',
      'autoplay=()',
      'camera=()',
      'display-capture=()',
      'encrypted-media=()',
      'fullscreen=(self)',
      'geolocation=()',
      'gyroscope=()',
      'magnetometer=()',
      'microphone=()',
      'payment=()',
      'screen-wake-lock=()',
    ].join(', '),
  );
  res.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  res.headers.set('Cross-Origin-Resource-Policy', 'same-site');
  // res.headers.set('Cross-Origin-Embedder-Policy', 'require-corp'); // enable when COEP-safe
  res.headers.set('x-noa-country', country);
  res.headers.set('x-nonce', nonce);
  return res;
}

export const config = {
  matcher: ['/((?!_next/|icons/|manifest|favicon|.*\\.(?:png|jpg|jpeg|webp|avif|svg)).*)'],
};
