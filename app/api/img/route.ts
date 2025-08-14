import { Readable } from 'node:stream';
import type { ReadableStream } from 'node:stream/web';

import { NextResponse } from 'next/server';
import sharp from 'sharp';

const ALLOW = [
  /^https:\/\/newsonafrica\.com\//,
  /^https:\/\/.*\.newsonafrica\.com\//,
  /^https:\/\/[^/]+\.supabase\.co\//,
];
const MAX = 5 * 1024 * 1024;

export function isAllowedSrc(src: string): boolean {
  return ALLOW.some((rx) => rx.test(src));
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const src = u.searchParams.get('src');
  const width = Number(u.searchParams.get('w') ?? '0') || undefined;
  const quality = Number(u.searchParams.get('q') ?? '0') || 75;

  if (!src || !isAllowedSrc(src)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 400 });
  }

  const r = await fetch(src, { headers: { Accept: 'image/*' } });
  const len = Number(r.headers.get('content-length') ?? '0');
  if (len > MAX) {
    return NextResponse.json({ error: 'too_big' }, { status: 413 });
  }

  const ct = r.headers.get('content-type') ?? 'image/jpeg';
  const transformer = sharp();
  if (width) transformer.resize({ width });
  if (ct.includes('png')) transformer.png({ quality });
  else transformer.jpeg({ quality });

  const body = r.body as unknown as ReadableStream;
  const stream = Readable.fromWeb(body).pipe(transformer);
  const webStream = Readable.toWeb(stream);

  return new NextResponse(webStream, {
    headers: {
      'Content-Type': ct.includes('png') ? 'image/png' : 'image/jpeg',
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  });
}

export const runtime = 'nodejs';
