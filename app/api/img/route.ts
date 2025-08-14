import { NextResponse } from 'next/server';

const ALLOW = [
  /^https:\/\/newsonafrica\.com\//,
  /^https:\/\/.*\.newsonafrica\.com\//,
  /^https:\/\/[^/]+\.supabase\.co\//,
];
const MAX = 5 * 1024 * 1024;

export async function GET(req: Request) {
  const u = new URL(req.url);
  const src = u.searchParams.get('src');
  if (!src || !ALLOW.some((rx) => rx.test(src))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 400 });
  }
  const r = await fetch(src, { headers: { Accept: 'image/*' } });
  const len = Number(r.headers.get('content-length') ?? '0');
  if (len > MAX) {
    return NextResponse.json({ error: 'too_big' }, { status: 413 });
  }
  return new NextResponse(r.body, {
    headers: {
      'Content-Type': r.headers.get('content-type') ?? 'image/jpeg',
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  });
}
