import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { WORDPRESS_REST_API_URL } from '@/config/wordpress';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

export const revalidate = 300; // ISR-like cache hint for this route (5 minutes)

// Helpers
function stripTags(html: string) {
  return html.replace(/<[^>]*>/g, '');
}
function decodeBasicEntities(s: string) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}
function cleanTitle(input: string) {
  return decodeBasicEntities(stripTags(input || '').trim());
}

type Item = { slug: string; title: string };

// Try Supabase (admin) if configured
async function fetchFromSupabase(limit: number): Promise<Item[] | null> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    // Not configured; signal caller to try fallback
    return null;
  }

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Popularity proxy: aggregate bookmarks by slug
  const { data, error } = await admin
    .from('bookmarks')
    .select('slug,title,created_at')
    .order('created_at', { ascending: false })
    .limit(3000);

  if (error) {
    // Log but do not throw; fallback will be used.
    console.error('Supabase error fetching bookmarks:', error);
    return null;
  }

  const counts = new Map<string, { slug: string; title: string; count: number }>();
  for (const row of data || []) {
    const rowData = row as { slug?: string; title?: string };
    const slug = rowData.slug;
    if (!slug) continue;
    const title = cleanTitle(rowData.title ?? slug);
    const existing = counts.get(slug);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(slug, { slug, title, count: 1 });
    }
  }

  const items = Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((i) => ({ slug: i.slug, title: i.title }));

  return items;
}

// Fallback to WordPress REST posts
function wpPostsUrl(perPage: number) {
  const base = WORDPRESS_REST_API_URL.replace(/\/$/, '');
  return `${base}/posts?per_page=${perPage}&_fields=slug,title`;
}

async function fetchFromWordPress(limit: number): Promise<Item[] | null> {
  const url = wpPostsUrl(limit);
  if (!url) return null;
  const res = await fetch(url, {
    // Make it CDN-friendly but still refresh often
    next: { revalidate: 300 },
    headers: { accept: 'application/json' },
  });
  if (!res.ok) {
    console.error('WordPress fallback failed:', res.status, await res.text().catch(() => ''));
    return null;
  }
  const posts = (await res.json()) as Array<{
    slug?: string;
    title?: { rendered?: string } | string;
  }>;
  return (posts || [])
    .map((p) => {
      const slug = p.slug || '';
      const rawTitle = typeof p.title === 'string' ? p.title : p.title?.rendered || slug;
      return { slug, title: cleanTitle(rawTitle) };
    })
    .filter((p) => p.slug)
    .slice(0, limit);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const limitParam = searchParams.get('limit');
    const limit = Math.max(1, Math.min(Number(limitParam) || 5, 20));

    // 1) Try Supabase (if configured)
    const sb = await fetchFromSupabase(limit);
    if (sb && sb.length > 0) {
      const res = NextResponse.json({ items: sb });
      res.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
      return res;
    }

    // 2) Fallback to WordPress recent posts
    const wp = await fetchFromWordPress(limit);
    if (wp && wp.length > 0) {
      const res = NextResponse.json({ items: wp });
      res.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
      return res;
    }

    // 3) Ultimate fallback: empty list
    const res = NextResponse.json({ items: [] });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (err) {
    console.error('Unexpected error in /api/most-read:', err);
    const res = NextResponse.json({ items: [], error: 'Unexpected error' }, { status: 500 });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  }
}
