import { NextResponse } from 'next/server';
import {
  getLatestPostsForCountry,
  getPostsByCategoryForCountry,
} from '@/lib/wordpress-api';
import { CACHE_DURATIONS } from '@/lib/cache-utils';

// Cache policy: short (1 minute)
export const revalidate = CACHE_DURATIONS.SHORT;

export async function GET(req: Request) {
  const u = new URL(req.url);
  const countryCode = (u.searchParams.get('country') || 'DEFAULT').toLowerCase();
  const section = u.searchParams.get('section') || undefined;
  try {
    const data = section
      ? await getPostsByCategoryForCountry(countryCode, section, 20)
      : await getLatestPostsForCountry(countryCode, 20);
    return NextResponse.json(data.posts ?? data);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}
