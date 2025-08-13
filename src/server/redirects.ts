import { NextRequest, NextResponse } from 'next/server';

const COUNTRIES = ['za', 'sz'];

export function handleRedirect(req: NextRequest): NextResponse | null {
  const url = new URL(req.url);
  const original = url.pathname;
  let normalized = original.toLowerCase();
  if (normalized !== '/' && normalized.endsWith('/')) normalized = normalized.slice(0, -1);
  if (original !== normalized) {
    url.pathname = normalized;
    return NextResponse.redirect(url, 301);
  }
  const segments = normalized.split('/').filter(Boolean);
  if (segments.length === 1 && !COUNTRIES.includes(segments[0])) {
    url.pathname = `/za/${segments[0]}`;
    return NextResponse.redirect(url, 301);
  }
  return null;
}
