import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { resolveCountry } from '@/config/countries';

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const country = resolveCountry(req.headers.get('host') ?? '', url.pathname);
  const res = NextResponse.next();
  res.headers.set('x-noa-country', country);
  return res;
}

export const config = { matcher: ['/((?!_next|.*\\..*).*)'] };
